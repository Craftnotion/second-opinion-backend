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
    // initialize default mail data with config values
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

  // actual sending logic used by queue consumer
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

  // public methods now enqueue jobs onto the 'email' queue
  async otpMail(data: { otp: string; identity: string }) {
    await this.queue.add(
      'send-email',
      { type: 'otp', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async inviteUser(data: { email: string; url: any; name: string }) {
    await this.queue.add(
      'send-email',
      { type: 'invite-user', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async newApplication(data: {
    email: string;
    user_name: string;
    applicant_name: string;
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'new-application', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async applicationShortlisted(data: {
    email: string;
    user_name: string;
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'application-shortlisted', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async applicationAccepted(data: {
    email: string;
    user_name: string;
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'application-accepted', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async applicationRejected(data: {
    email: string;
    user_name: string;
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'application-rejected', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async projectClosed(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'project_closed', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async projectApplicationClosed(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'project_application_closed', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async projectDraft(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'project_draft', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async projectPublished(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'project_published', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async newConnection(data: {
    email: string;
    user_name: string;
    sender_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'new-connection', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async connectionAccepted(data: {
    email: string;
    user_name: string;
    receiver_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'connection-accepted', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async connectionRejected(data: {
    email: string;
    user_name: string;
    receiver_name: string;
    url: any;
  }) {
    await this.queue.add(
      'send-email',
      { type: 'connection-rejected', ...data },
      { attempts: 3, removeOnComplete: true },
    );
  }

  public async paymentStatus(data: {
    key: string;
    email: string;
    user_name: string;
    url: any;
    amount: number;
  }) {
    await this.queue.add(
      'send-email',
      { type: `payment-${data.key}`, ...data },
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

      case 'invite-user':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.invite-user.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.invite-user.body`,
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.invite-user.greet`,
          { name: data.name },
        );
        this.mail_data.button = { url: data.url, label: 'Log in' };

        await this.sendNow(data.email);
        break;

      case 'new-application':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.new-application.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.new-application.body`,
          {
            user_name: data.user_name,
            applicant_name: data.applicant_name,
            project_name: data.project_name,
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.new-application.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        await this.sendNow(data.email);
        break;

      case 'application-shortlisted':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.application-shortlisted.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.application-shortlisted.body`,
          { user_name: data.user_name, project_name: data.project_name },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.application-shortlisted.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        await this.sendNow(data.email);
        break;

      case 'application-accepted':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.application-accepted.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.application-accepted.body`,
          { user_name: data.user_name, project_name: data.project_name },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.application-accepted.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        await this.sendNow(data.email);
        break;

      case 'application-rejected':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.application-rejected.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.application-rejected.body`,
          { user_name: data.user_name, project_name: data.project_name },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.application-rejected.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        await this.sendNow(data.email);
        break;

      case 'project_closed':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.project-closed.subject`,
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        for (const i in data.email) {
          this.mail_data.greet = this.stringService.formatMessage(
            `email.project-closed.greet`,
            { user_name: data.user_name[i] },
          );
          this.mail_data.body = this.stringService.formatMessage(
            `email.project-closed.body`,
            { project_name: data.project_name, user_name: data.user_name[i] },
          );
          await this.sendNow(data.email[i]);
        }
        break;

      case 'project_application_closed':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.project_application_closed.subject`,
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        for (const i in data.email) {
          this.mail_data.greet = this.stringService.formatMessage(
            `email.project_application_closed.greet`,
            { user_name: data.user_name[i] },
          );
          this.mail_data.body = this.stringService.formatMessage(
            `email.project_application_closed.body`,
            { project_name: data.project_name, user_name: data.user_name[i] },
          );
          await this.sendNow(data.email[i]);
        }
        break;

      case 'project_draft':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.project-draft.subject`,
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        for (const i in data.email) {
          this.mail_data.greet = this.stringService.formatMessage(
            `email.project-published.greet`,
            { user_name: data.user_name[i] },
          );
          this.mail_data.body = this.stringService.formatMessage(
            `email.project-published.body`,
            { project_name: data.project_name, user_name: data.user_name[i] },
          );
          await this.sendNow(data.email[i]);
        }
        break;

      case 'project_published':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.project-published.subject`,
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        for (const i in data.email) {
          this.mail_data.greet = this.stringService.formatMessage(
            `email.project-published.greet`,
            { user_name: data.user_name[i] },
          );
          this.mail_data.body = this.stringService.formatMessage(
            `email.project-published.body`,
            { project_name: data.project_name, user_name: data.user_name[i] },
          );
          await this.sendNow(data.email[i]);
        }
        break;

      case 'new-connection':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.new-connection.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.new-connection.body`,
          { user_name: data.user_name, sender_name: data.sender_name },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.new-connection.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        await this.sendNow(data.email);
        break;

      case 'connection-accepted':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.connection-accepted.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.connection-accepted.body`,
          { user_name: data.user_name, receiver_name: data.receiver_name },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.connection-accepted.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

        await this.sendNow(data.email);
        break;

      case 'connection-rejected':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.connection-rejected.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.connection-rejected.body`,
          { user_name: data.user_name, receiver_name: data.receiver_name },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.connection-rejected.greet`,
          { user_name: data.user_name },
        );
        this.mail_data.button = { url: data.url, label: 'See Details' };

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
