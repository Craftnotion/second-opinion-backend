import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Processor('email')
export class MailQueueConsumer extends WorkerHost implements OnModuleInit {
  constructor(
    @Inject(forwardRef(() => MailService))
    private EmailService: MailService,
  ) {
    super();
   
  }

  async onModuleInit() {
    console.log('MailQueueConsumer: onModuleInit called - processor is ready');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
    
      console.log('MailQueueConsumer.process: starting job', { jobId: job.id, name: job.name, attemptsMade: job.attemptsMade, timestamp: new Date().toISOString() });
      console.log('MailQueueConsumer.process: job.data preview', { type: job.data?.type, email: job.data?.email || job.data?.identity, otp: job.data?.otp ? true : undefined });

      await this.EmailService.handleJob(job.data);

      console.log('MailQueueConsumer.process: completed job', { jobId: job.id });
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
