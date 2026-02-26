import { Module } from '@nestjs/common';
import { TextQueueProcessor } from './text-queue.processor';
import { BullModule } from '@nestjs/bullmq';
import { TEXT_QUEUE_NAME } from './text-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TEXT_QUEUE_NAME,
      connection: {
        host: 'localhost', // or your Redis host
        port: 6379,
      },
    }),
  ],
  providers: [TextQueueProcessor],
})
export class TextQueueModule {}
