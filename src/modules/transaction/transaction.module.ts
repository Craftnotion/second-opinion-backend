import { Module, forwardRef } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from 'src/database/entities/transaction.entity';
import { User } from 'src/database/entities/user.entity';
import { UserModule } from '../user/user.module';
import { MailQueueModule } from 'src/queue/email-queue/email-queue.module';
import { BullModule } from '@nestjs/bullmq';
import { TEXT_QUEUE_NAME } from 'src/queue/text-queue/text-queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User]),
    forwardRef(() => UserModule),
    MailQueueModule,
    BullModule.registerQueue({
      name: TEXT_QUEUE_NAME,
    }),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
