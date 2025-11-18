import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { Requests } from 'src/database/entities/request.entity';
import { Document } from 'src/database/entities/document.entity';
import { Transaction } from 'src/database/entities/transaction.entity';
import { UniqueIdGenerator } from 'src/services/uid-generator/uid-generator.service';
import { BullModule } from '@nestjs/bullmq';
import { MailQueueModule } from 'src/queue/email-queue/email-queue.module';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Requests, Document, Transaction]),
    AuthModule,
    MailQueueModule,
    forwardRef(() => TransactionModule),
  ],
  controllers: [UserController],
  providers: [UserService, UniqueIdGenerator],
  exports: [UserService],
})
export class UserModule {}
