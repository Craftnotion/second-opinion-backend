import { Module } from '@nestjs/common';
import { TextQueueProcessor } from './text-queue.processor';

@Module({
  providers: [TextQueueProcessor],
})
export class TextQueueModule {}
