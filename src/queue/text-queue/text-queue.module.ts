import { Module } from '@nestjs/common';
import { TextQueueProcessor } from './text-queue.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'text',
      connection: {
        host: 'localhost', // or your Redis host
        port: 6379,
      },
    }),
  ],
  providers: [TextQueueProcessor],
})
export class TextQueueModule {}
