import { Module } from '@nestjs/common';
import { TextQueueProcessor } from './text-queue.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'text',
    }),
  ],
  providers: [TextQueueProcessor],
})
export class TextQueueModule {}
