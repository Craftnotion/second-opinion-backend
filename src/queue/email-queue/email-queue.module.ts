import { Global, Module } from '@nestjs/common';

import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { StringService } from 'src/services/string/string.service';

import { MailerConfig } from 'src/config/email.config';
import { MailService } from 'src/services/email/email.service';
import { MailQueueConsumer } from './email-queue.processor';

@Global()
@Module({
  imports: [
    MailerModule.forRoot(MailerConfig),

    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [MailQueueConsumer, MailService, StringService],
  exports: [MailQueueConsumer, MailService, StringService],
})
export class MailQueueModule {}
