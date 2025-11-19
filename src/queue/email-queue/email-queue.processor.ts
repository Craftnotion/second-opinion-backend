import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Processor('email')
export class MailQueueConsumer extends WorkerHost implements OnModuleInit {
  constructor(private EmailService: MailService) {
    super();
    console.log('MailQueueConsumer: Constructor called, processor initialized');
  }

  async onModuleInit() {
    console.log('MailQueueConsumer: onModuleInit called - processor is ready');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      console.log('EmailQueueProcessor: Processing email job', {
        jobId: job.id,
        type: job.data.type,
        data: job.data,
      });
      await this.EmailService.handleJob(job.data);
      console.log('EmailQueueProcessor: Email job completed successfully', {
        jobId: job.id,
      });
    } catch (error) {
      console.error('EmailQueueProcessor: Error processing email job', {
        jobId: job.id,
        error: error?.message,
        stack: error?.stack,
      });
      throw error; // Re-throw to trigger retry
    }
  }
}
