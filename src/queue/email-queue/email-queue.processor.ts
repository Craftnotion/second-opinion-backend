import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Processor('email')
export class MailQueueConsumer extends WorkerHost {
  constructor(private EmailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    await this.EmailService.handleJob(job.data);
  }
}
