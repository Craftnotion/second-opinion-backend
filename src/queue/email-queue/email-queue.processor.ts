import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit, Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Processor('email')
export class MailQueueConsumer extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(MailQueueConsumer.name);

  constructor(
    @Inject(MailService)
    private EmailService: MailService,
  ) {
    super();
    this.logger.log('MailQueueConsumer: Constructor called');
  }

  async onModuleInit() {
    this.logger.log('MailQueueConsumer: onModuleInit called - processor is ready');
    this.logger.log('MailQueueConsumer: Worker should be active and listening for jobs');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      this.logger.log('MailQueueConsumer.process: starting job', { 
        jobId: job.id, 
        name: job.name, 
        attemptsMade: job.attemptsMade, 
        timestamp: new Date().toISOString() 
      });
      this.logger.log('MailQueueConsumer.process: job.data preview', { 
        type: job.data?.type, 
        email: job.data?.email || job.data?.identity, 
        otp: job.data?.otp ? true : undefined 
      });

      await this.EmailService.handleJob(job.data);

      this.logger.log('MailQueueConsumer.process: completed job', { jobId: job.id });
    } catch (error) {
      this.logger.error('EmailQueueProcessor: Error processing email job', {
        jobId: job.id,
        error: error?.message,
        stack: error?.stack,
      });
      throw error; // Re-throw to trigger retry
    }
  }
}
