import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as config from 'config';
import { join } from 'path';
import { existsSync } from 'fs';

const mailConfig = config.get<{ [key: string]: string }>('mail');

const distI18n = join(process.cwd(), 'dist', 'i18n');
const srcI18n = join(process.cwd(), 'src', 'i18n');
const templateDir = existsSync(distI18n) ? distI18n : srcI18n;

export const MailerConfig = {
  transport: {
    host: mailConfig.host,
    port: parseInt(mailConfig.port || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: mailConfig.user,
      pass: mailConfig.password,
    },
    tls: {
      rejectUnauthorized: false, // For development, set to true in production
    },
  },
  defaults: {
    from: `"no-reply" <${mailConfig.from}>`,
  },
  template: {
    dir: templateDir,
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
};
