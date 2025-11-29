import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/services/email/email.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async submitContactForm(data: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) {
    const adminEmail = this.config.get<string>('email.admin_email');
    
    if (!adminEmail) {
      throw new Error('Admin email not configured');
    }

    await this.mailService.sendContactFormEmail({
      to: adminEmail,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    });

    return {
      success: 1,
      message: 'Contact form submitted successfully',
    };
  }
}

