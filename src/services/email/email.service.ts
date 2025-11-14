import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StringService } from '../string/string.service';
// template names are used (resolved by Mailer template.dir)
import { mail_data } from 'src/types/types';

@Injectable()
export class MailService {
  constructor(
    private readonly config: ConfigService,
    private readonly stringService: StringService,
    private readonly mailerService: MailerService,
  ) {}

  private mail_data: mail_data = {
    subject: '',
    body: '',
    greet: '',
    logo: `https://seniorexperts.in/home/images/logo.png`,
    app_name: this.config.get<string>('name') || 'SENIOR EXPERTS',
    app_background: this.config.get<string>('background') || '',
    app_color: this.config.get<string>('color') || '',
  };

  private async send(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.mail_data.subject,
        // Use a template name relative to the MailerConfig.template.dir.
        // The adapter will resolve e.g. <templateDir>/email/template.hbs
        template: 'email/template',
        context: { data: this.mail_data },
      });
    } catch (error) {
      console.log('error in sending email ', error);
    }
  }

  async otpMail(data: { otp: string; identity: string }) {
    this.mail_data.subject =
      this.stringService.formatMessage(`email.otp.subject`);
    this.mail_data.body = this.stringService.formatMessage(`email.otp.body`, {
      otp: data.otp,
    });
    this.mail_data.greet = this.stringService.formatMessage(`email.greet`);
    this.mail_data.button = { url: '#', label: data.otp };

    await this.send(data.identity);
  }

  async inviteUser(data: { email: string; url: any; name: string }) {
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

    await this.send(data.email);
  }

  public async newApplication(data: {
    email: string;
    user_name: string;
    applicant_name: string;
    project_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async applicationShortlisted(data: {
    email: string;
    user_name: string;
    project_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async applicationAccepted(data: {
    email: string;
    user_name: string;
    project_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async applicationRejected(data: {
    email: string;
    user_name: string;
    project_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async projectClosed(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
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
      await this.send(data.email[i]);
    }
  }

  public async projectApplicationClosed(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
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
      await this.send(data.email[i]);
    }
  }

  public async projectDraft(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
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
      await this.send(data.email[i]);
    }
  }

  public async projectPublished(data: {
    user_name: string[];
    email: string[];
    project_name: string;
    url: any;
  }) {
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
      await this.send(data.email[i]);
    }
  }

  public async newConnection(data: {
    email: string;
    user_name: string;
    sender_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async connectionAccepted(data: {
    email: string;
    user_name: string;
    receiver_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async connectionRejected(data: {
    email: string;
    user_name: string;
    receiver_name: string;
    url: any;
  }) {
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

    await this.send(data.email);
  }

  public async paymentStatus(data: {
    key: string;
    email: string;
    user_name: string;
    url: any;
    amount: number;
  }) {
    this.mail_data.subject = this.stringService.formatMessage(
      `email.payment-${data.key}.subject`,
    );
    this.mail_data.body = this.stringService.formatMessage(
      `email.payment-${data.key}.body`,
      { user_name: data.user_name, amount: data.amount },
    );
    this.mail_data.greet = this.stringService.formatMessage(
      `email.payment-${data.key}.greet`,
      { user_name: data.user_name },
    );
    this.mail_data.button = { url: data.url, label: 'See Details' };

    await this.send(data.email);
  }
}
