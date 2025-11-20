import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StringService } from '../string/string.service';
// template names are used (resolved by Mailer template.dir)
import { mail_data } from 'src/types/types';

type OtpMailPayload = { type: 'otp'; identity: string; otp: string };
type NewApplicationPayload = {
  type: 'new-application';
  email: string;
  applicant_name: string;
  project_name: string;
  user_name: string;
  url?: string;
};
type OpinionCreatedPayload = {
  type: 'opinion-created';
  email: string;
  user_name: string;
  request: string;
  url?: string;
};
type PaymentStatusChangedPayload = {
  type: 'payment-status-changed';
  to: string;
  name: string;
  amount: string;
  orderId: string;
  paymentId: string;
  paidAt: string;
  url?: string;
};
type PaymentAdminNotificationPayload = {
  type: 'payment-admin-notification';
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
  url?: string;
};
type GenericPaymentPayload = {
  type: `payment-${string}`;
  name: string;
  amount: string;
  to: string;
  url?: string;
};

type MailJobPayload =
  | OtpMailPayload
  | NewApplicationPayload
  | OpinionCreatedPayload
  | PaymentStatusChangedPayload
  | PaymentAdminNotificationPayload
  | GenericPaymentPayload;

@Injectable()
export class MailService {
  private mail_data: mail_data;

  constructor(
    private readonly config: ConfigService,
    private readonly stringService: StringService,
    private readonly mailerService: MailerService,
  ) {
    this.mail_data = {
      subject: '',
      body: '',
      greet: '',
      logo:
        this.config.get<string>('logo') ||
        `https://opinions.secondaid.in/fav/ms-icon-310x310.png`,
      app_name: 'Second Opinion',
      app_background: this.config.get<string>('background') || '',
      app_color: this.config.get<string>('color') || '',
    };
  }

  private async sendNow(email: string) {
    try {
      console.log(`MailService.sendNow: Sending email to ${email} - subject=${this.mail_data.subject}`);
      console.log('MailService.sendNow: template=email/template, context keys=', Object.keys(this.mail_data));

      const result = await this.mailerService.sendMail({
        to: email,
        subject: this.mail_data.subject,
        template: 'email/template',
        context: { data: this.mail_data },
      });

      console.log('MailService.sendNow: sendMail result:', result);
      return result;
    } catch (error) {
      console.error('Error in sending email to:', email, error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        response: error?.response,
      });
      throw error;
    }
  }

  async otpMail(data: { otp: string; identity: string }) {
    await this.handleJob({ type: 'otp', ...data });
  }

  public async requestCreated(data: {
    email: string;
    applicant_name: string;
    specialty?: string;
    urgency?: string;
  }) {
    const project_name = data.specialty || data.urgency || '';
    await this.handleJob({
      type: 'new-application',
      email: data.email,
      applicant_name: data.applicant_name,
      project_name,
      user_name: '',
    });
  }

  public async opinionCreated(data: {
    email: string;
    user_name: string;
    request: string;
    url?: string;
  }) {
    await this.handleJob({
      type: 'opinion-created',
      email: data.email,
      user_name: data.user_name,
      request: data.request,
      url: data.url,
    });
  }

  async sendPaymentSuccessEmail(data: {
    to: string;
    name: string;
    amount: string;
    orderId: string;
    paymentId: string;
    paidAt: string;
  }) {
    await this.handleJob({
      type: `payment-status-changed`,
      to: data.to,
      name: data.name,
      amount: data.amount,
      orderId: data.orderId,
      paymentId: data.paymentId,
      paidAt: data.paidAt,
    });
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
    await this.handleJob({
      type: `payment-admin-notification`,
      transactionId: data.transactionId,
      amount: data.amount,
      orderId: data.orderId,
      paymentId: data.paymentId,
      paidAt: data.paidAt,
      email: data.email,
      user: data.user,
    });
  }
  public async handleJob(data: MailJobPayload) {
    const { type } = data;
    console.log('MailService.handleJob: received job', {
      type,
      dataPreview: {
        ...(this.isGenericPaymentPayload(data) ? { to: data.to } : {}),
        ...(type === 'otp'
          ? { identity: (data as OtpMailPayload).identity, otp: true }
          : {}),
        ...(type === 'new-application' || type === 'opinion-created'
          ? { email: (data as NewApplicationPayload | OpinionCreatedPayload).email }
          : {}),
      },
    });

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
        if (this.isGenericPaymentPayload(data)) {
          const key = data.type.replace('payment-', '');
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
          this.mail_data.button = { url: data.url || '#', label: 'See Details' };
          await this.sendNow(data.to);
        }
        break;
    }
  }

  private isGenericPaymentPayload(payload: MailJobPayload): payload is GenericPaymentPayload {
    return payload.type.startsWith('payment-') && 'to' in payload && 'name' in payload;
  }
}
