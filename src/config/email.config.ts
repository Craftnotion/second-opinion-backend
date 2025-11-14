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
    secure: false,
    auth: {
      user: mailConfig.user,
      pass: mailConfig.password,
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
