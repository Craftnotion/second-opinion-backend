import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Processor('email')
export class MailQueueConsumer extends WorkerHost {
  constructor(private EmailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    let { type } = job.data;

    switch (type) {
      case 'otp':
        await this.EmailService.otpMail(job.data);
        break;
      case 'invite-user':
        await this.EmailService.inviteUser(job.data);
        break;

      case 'new-application':
        await this.EmailService.newApplication(job.data);
        break;
      case 'application-shortlisted':
        await this.EmailService.applicationShortlisted(job.data);
        break;
      case 'application-accepted':
        await this.EmailService.applicationAccepted(job.data);
        break;
      case 'application-rejected':
        await this.EmailService.applicationRejected(job.data);
        break;

      case 'project_published':
        await this.EmailService.projectPublished(job.data);
        break;
      case 'project_application_closed':
        await this.EmailService.projectApplicationClosed(job.data);
        break;
      case 'project_closed':
        await this.EmailService.projectClosed(job.data);
        break;
      case 'project_draft':
        await this.EmailService.projectDraft(job.data);
        break;

      case 'new-connection':
        await this.EmailService.newConnection(job.data);
        break;
      case 'connection-accepted':
        await this.EmailService.connectionAccepted(job.data);
        break;
      case 'connection-rejected':
        await this.EmailService.connectionRejected(job.data);
        break;
      case 'payment-reversed':
        await this.EmailService.paymentStatus(job.data);
        break;
      case 'payment-cancelled':
        await this.EmailService.paymentStatus(job.data);
        break;
      case 'payment-processed':
        await this.EmailService.paymentStatus(job.data);
        break;
      case 'payment-failed':
        await this.EmailService.paymentStatus(job.data);
        break;
    }
  }
}
