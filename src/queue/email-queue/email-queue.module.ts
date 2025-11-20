import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { StringService } from 'src/services/string/string.service';
import { MailerConfig } from 'src/config/email.config';
import { MailService } from 'src/services/email/email.service';

@Global()
@Module({
  imports: [
    MailerModule.forRoot(MailerConfig),
  ],
  providers: [MailService, StringService],
  exports: [MailService, StringService],
})
export class MailQueueModule {}
