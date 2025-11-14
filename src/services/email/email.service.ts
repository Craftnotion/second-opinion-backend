import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StringService } from '../string/string.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
// template names are used (resolved by Mailer template.dir)
import { mail_data } from 'src/types/types';

@Injectable()
export class MailService {
  private mail_data: mail_data;

  constructor(
    private readonly config: ConfigService,
    private readonly stringService: StringService,
    private readonly mailerService: MailerService,
    @InjectQueue('email') private readonly queue: Queue,
  ) {
    this.mail_data = {
      subject: '',
      body: '',
      greet: '',
      logo: `https://seniorexperts.in/home/images/logo.png`,
      app_name: this.config.get<string>('name') || 'SENIOR EXPERTS',
      app_background: this.config.get<string>('background') || '',
      app_color: this.config.get<string>('color') || '',
    };
  }

  private async sendNow(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.mail_data.subject,
        template: 'email/template',
        context: { data: this.mail_data },
      });
    } catch (error) {
      console.log('error in sending email ', error);
    }
  }

  async otpMail(data: { otp: string; identity: string }) {
    await this.queue.add(
      'send-email',
      { type: 'otp', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async requestCreated(data: {
    email: string;
    applicant_name: string;
    specialty?: string;
    urgency?: string;
  }) {
    const project_name = data.specialty || data.urgency || '';
    await this.queue.add(
      'send-email',
      {
        type: 'new-application',
        email: data.email,
        applicant_name: data.applicant_name,
        project_name,
        user_name: '',
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  // called by the queue consumer to actually format and send the email
  public async handleJob(data: any) {
    const type: string = data.type;

    switch (type) {
      case 'otp':
        this.mail_data.subject =
          this.stringService.formatMessage(`email.otp.subject`);
        this.mail_data.body = this.stringService.formatMessage(
          `email.otp.body`,
          { otp: data.otp },
        );
        this.mail_data.greet = this.stringService.formatMessage(`email.greet`);
        this.mail_data.button = { url: '#', label: data.otp };

        await this.sendNow(data.identity);
        break;
      case 'new-application':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.new-application.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.new-application.body`,
          {
            user_name: data.user_name || '',
            applicant_name: data.applicant_name || '',
            project_name: data.project_name || '',
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.new-application.greet`,
          { user_name: data.user_name || '' },
        );
        this.mail_data.button = { url: data.url || '#', label: 'See Details' };

        await this.sendNow(data.email);
        break;
      default:
        // payment-* and other patterns
        if (type?.startsWith?.('payment-')) {
          const key = type.replace('payment-', '');
          this.mail_data.subject = this.stringService.formatMessage(
            `email.payment-${key}.subject`,
          );
          this.mail_data.body = this.stringService.formatMessage(
            `email.payment-${key}.body`,
            { user_name: data.user_name, amount: data.amount },
          );
          this.mail_data.greet = this.stringService.formatMessage(
            `email.payment-${key}.greet`,
            { user_name: data.user_name },
          );
          this.mail_data.button = { url: data.url, label: 'See Details' };
          await this.sendNow(data.email);
        }
        break;
    }
  }
}
