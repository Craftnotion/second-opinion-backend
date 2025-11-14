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
      logo:
        this.config.get<string>('logo') ||
        `https://seniorexperts.in/home/images/logo.png`,
      app_name: 'Second Opinion',
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

  public async opinionCreated(data: {
    email: string;
    user_name: string;
    request: string;
    url?: string;
  }) {
    await this.queue.add(
      'send-email',
      {
        type: 'opinion-created',
        email: data.email,
        user_name: data.user_name,
        request: data.request,
        url: data.url,
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendPaymentSuccessEmail(data: {
    to: string;
    name: string;
    amount: string;
    orderId: string;
    paymentId: string;
    paidAt: string;
  }) {
    await this.queue.add(
      'send-email',
      {
        to: data.to,
        name: data.name,
        amount: data.amount,
        orderId: data.orderId,
        paymentId: data.paymentId,
        paidAt: data.paidAt,
        type: `payment-status-changed`,
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendPaymentSuccessNotificationToAdmins(data: {
    transactionId: string;
    amount: string;
    orderId: string;
    paymentId: string;
    paidAt: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  }) {
    await this.queue.add(
      'send-email',
      {
        transactionId: data.transactionId,
        amount: data.amount,
        orderId: data.orderId,
        paymentId: data.paymentId,
        paidAt: data.paidAt,
        user: data.user,
        type: `payment-admin-notification`,
      },
      { attempts: 3, removeOnComplete: true },
    );
  }
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
      case 'opinion-created':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.opinion-created.subject`,
          { request: data.request || '' },
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.opinion-created.body`,
          {
            user_name: data.user_name || '',
            request: data.request || '',
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.opinion-created.greet`,
          { user_name: data.user_name || '' },
        );
        this.mail_data.button = {
          url: data.url || '#',
          label: this.stringService.formatMessage(
            `email.opinion-created.button`,
          ),
        };
        await this.sendNow(data.email);
        break;
      default:
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
