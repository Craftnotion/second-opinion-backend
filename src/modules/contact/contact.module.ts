import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { MailQueueModule } from 'src/queue/email-queue/email-queue.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [MailQueueModule, ConfigModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}



