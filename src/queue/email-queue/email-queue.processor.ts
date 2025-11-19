import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Processor('email')
export class MailQueueConsumer extends WorkerHost {
  constructor(private EmailService: MailService) {
    super();
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
