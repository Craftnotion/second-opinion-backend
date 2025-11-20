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
    const dataPreview: Record<string, unknown> = {};
    
    if (type === 'otp') {
      const payload = data as OtpMailPayload;
      dataPreview.identity = payload.identity;
      dataPreview.otp = true;
    } else if (type === 'new-application' || type === 'opinion-created') {
      const payload = data as NewApplicationPayload | OpinionCreatedPayload;
      dataPreview.email = payload.email;
    } else if (this.isGenericPaymentPayload(data)) {
      dataPreview.to = data.to;
    } else if (type === 'payment-status-changed') {
      const payload = data as PaymentStatusChangedPayload;
      dataPreview.to = payload.to;
    } else if (type === 'payment-admin-notification') {
      const payload = data as PaymentAdminNotificationPayload;
      dataPreview.email = payload.email;
    }
    
    console.log('MailService.handleJob: received job', {
      type,
      dataPreview,
    });

    switch (type) {
      case 'otp': {
        const payload = data as OtpMailPayload;
        this.mail_data.subject =
          this.stringService.formatMessage(`email.otp.subject`);
        this.mail_data.body = this.stringService.formatMessage(
          `email.otp.body`,
          { otp: payload.otp },
        );
        this.mail_data.greet = this.stringService.formatMessage(`email.greet`);
        this.mail_data.button = { url: '#', label: payload.otp };

        await this.sendNow(payload.identity);
        break;
      }
      case 'new-application': {
        const payload = data as NewApplicationPayload;
        this.mail_data.subject = this.stringService.formatMessage(
          `email.new-application.subject`,
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.new-application.body`,
          {
            user_name: payload.user_name || '',
            applicant_name: payload.applicant_name || '',
            project_name: payload.project_name || '',
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.new-application.greet`,
          { user_name: payload.user_name || '' },
        );
        this.mail_data.button = { url: payload.url || '#', label: 'See Details' };

        await this.sendNow(payload.email);
        break;
      }
      case 'opinion-created': {
        const payload = data as OpinionCreatedPayload;
        this.mail_data.subject = this.stringService.formatMessage(
          `email.opinion-created.subject`,
          { request: payload.request || '' },
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.opinion-created.body`,
          {
            user_name: payload.user_name || '',
            request: payload.request || '',
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.opinion-created.greet`,
          { user_name: payload.user_name || '' },
        );
        this.mail_data.button = {
          url: payload.url || '#',
          label: this.stringService.formatMessage(
            `email.opinion-created.button`,
          ),
        };
        await this.sendNow(payload.email);
        break;
      }
      case 'payment-status-changed': {
        const payload = data as PaymentStatusChangedPayload;
        // email to the user who paid
        this.mail_data.subject = this.stringService.formatMessage(
          `email.payment-status-changed.subject`,
          { orderId: payload.orderId },
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.payment-status-changed.body`,
          {
            user_name: payload.name,
            amount: payload.amount,
            orderId: payload.orderId,
            paymentId: payload.paymentId,
            paidAt: payload.paidAt,
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.payment-status-changed.greet`,
          { user_name: payload.name },
        );
        this.mail_data.button = { url: payload.url || '#', label: 'View Order' };

        await this.sendNow(payload.to);
        break;
      }
      case 'payment-admin-notification': {
        const payload = data as PaymentAdminNotificationPayload;
        this.mail_data.subject = this.stringService.formatMessage(
          `email.payment-admin-notification.subject`,
          { orderId: payload.orderId, amount: payload.amount },
        );
        this.mail_data.body = this.stringService.formatMessage(
          `email.payment-admin-notification.body`,
          {
            transactionId: payload.transactionId,
            amount: payload.amount,
            orderId: payload.orderId,
            paymentId: payload.paymentId,
            paidAt: payload.paidAt,
            user_name: payload.user?.name,
            user_email: payload.user?.email,
            user_phone: payload.user?.phone,
          },
        );
        this.mail_data.greet = this.stringService.formatMessage(
          `email.payment-admin-notification.greet`,
        );
        this.mail_data.button = {
          url: payload.url || '#',
          label: 'View Transaction',
        };
        await this.sendNow(payload.email);
        break;
      }
      default:
        if (this.isGenericPaymentPayload(data)) {
          const payload = data as GenericPaymentPayload;
          const key = payload.type.replace('payment-', '');
          this.mail_data.subject = this.stringService.formatMessage(
            `email.payment-${key}.subject`,
          );
          this.mail_data.body = this.stringService.formatMessage(
            `email.payment-${key}.body`,
            { user_name: payload.name, amount: payload.amount },
          );
          this.mail_data.greet = this.stringService.formatMessage(
            `email.payment-${key}.greet`,
            { user_name: payload.name },
          );
          this.mail_data.button = { url: payload.url || '#', label: 'See Details' };
          await this.sendNow(payload.to);
        }
        break;
    }
  }

  private isGenericPaymentPayload(payload: MailJobPayload): payload is GenericPaymentPayload {
    return payload.type.startsWith('payment-') && 'to' in payload && 'name' in payload;
  }
}
