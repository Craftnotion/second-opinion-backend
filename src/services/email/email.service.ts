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
      console.log('Attempting to send email to:', email);
      console.log('Email subject:', this.mail_data.subject);
      const result = await this.mailerService.sendMail({
        to: email,
        subject: this.mail_data.subject,
        template: 'email/template',
        context: { data: this.mail_data },
      });
      console.log('Email sent successfully to:', email, result);
      return result;
    } catch (error) {
      console.error('Error in sending email to:', email, error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        response: error?.response,
      });
      throw error; // Re-throw so the queue can retry
    }
  }

  async otpMail(data: { otp: string; identity: string }) {
    try {
      console.log('MailService.otpMail: Adding job to queue', {
        email: data.identity,
        queueName: 'email',
        jobName: 'send-email',
      });
      const job = await this.queue.add(
        'send-email',
        { type: 'otp', ...data },
        { attempts: 3, removeOnComplete: true },
      );
      console.log('MailService.otpMail: Job added successfully', {
        jobId: job.id,
        jobName: job.name,
        email: data.identity,
      });
    } catch (error) {
      console.error('MailService.otpMail: Error adding job to queue', {
        error: error?.message,
        stack: error?.stack,
        email: data.identity,
      });
      throw error;
    }
  }

  public async requestCreated(data: {
    email: string;
    applicant_name: string;
    specialty?: string;
    urgency?: string;
  }) {
    const project_name = data.specialty || data.urgency || '';
    console.log('Queueing new application email to ', data.email);
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
    console.log('Queueing opinion created email to ', data.email);
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
    console.log('Queueing payment success email to ', data.to);
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
    email: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  }) {
    console.log('Queueing payment admin notification email');
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
        email: data.email,
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
      case 'payment-status-changed':
        // email to the user who paid
        this.mail_data.subject = this.stringService.formatMessage(
          `email.payment-status-changed.subject`,
          { orderId: data.orderId },
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.payment-status-changed.body`,
          {
            user_name: data.name,
            amount: data.amount,
            orderId: data.orderId,
            paymentId: data.paymentId,
            paidAt: data.paidAt,
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.payment-status-changed.greet`,
          { user_name: data.name },
        );
        this.mail_data.button = { url: data.url || '#', label: 'View Order' };

        await this.sendNow(data.to);
        break;
      case 'payment-admin-notification':
        this.mail_data.subject = this.stringService.formatMessage(
          `email.payment-admin-notification.subject`,
          { orderId: data.orderId, amount: data.amount },
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.payment-admin-notification.body`,
          {
            transactionId: data.transactionId,
            amount: data.amount,
            orderId: data.orderId,
            paymentId: data.paymentId,
            paidAt: data.paidAt,
            user_name: data.user?.name,
            user_email: data.user?.email,
            user_phone: data.user?.phone,
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.payment-admin-notification.greet`,
        );
        this.mail_data.button = {
          url: data.url || '#',
          label: 'View Transaction',
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
            { user_name: data.name, amount: data.amount },
          );
          this.mail_data.greet = this.stringService.formatMessage(
            `email.payment-${key}.greet`,
            { user_name: data.name },
          );
          this.mail_data.button = { url: data.url, label: 'See Details' };
          await this.sendNow(data.to);
        }
        break;
    }
  }
}
