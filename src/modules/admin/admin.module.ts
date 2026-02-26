import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { HashService } from 'src/services/hash/hash.service';
import { User } from 'src/database/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Opinion } from 'src/database/entities/opinion.entity';
import { opinionDocument } from 'src/database/entities/opinion-document.entity';
import { MailQueueModule } from 'src/queue/email-queue/email-queue.module';
import { BullModule } from '@nestjs/bullmq';
import { TEXT_QUEUE_NAME } from 'src/queue/text-queue/text-queue.constants';

@Module({
  imports: [
    UserModule,
    AuthModule,
    TypeOrmModule.forFeature([User, Opinion, opinionDocument]),
    MailQueueModule,
    BullModule.registerQueue({
      name: TEXT_QUEUE_NAME,
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, HashService],
})
export class AdminModule {}
