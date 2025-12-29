import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('text')
export class TextQueueProcessor extends WorkerHost {
  private readonly AUTH_KEY = '272160A7NN1J35i5cb096b1';
  private readonly SENDER = 'SECAID';

  constructor() {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name } = job;

    if (name === 'send-sms') {
      return this.sendOtpSms(job);
    } else if (name === 'send-payment-sms') {
      return this.sendPaymentSms(job);
    } else if (name === 'send-to-admin-payment-sms') {
      return this.sendAdminPaymentSms(job);
    } else if (name === 'response-created') {
      return this.sendResponseCreatedSms(job);
    } else {
      throw new Error(`Unknown job type: ${name}`);
    }
  }

  private async sendOtpSms(job: Job<any, any, string>): Promise<any> {
    const { phone, code } = job.data;

    if (!phone || !code) {
      const error = new Error(
        `Missing required data: phone=${phone}, code=${code}`,
      );
      console.error('TextQueueProcessor: Invalid OTP job data', error);
      throw error;
    }

    const mobileNo = `91${phone}`;
    const smsContent = `Dear user, your OTP for login is ${code}. Use this password to validate you login. SecondAid`;
    const dltTemplateId = '1307162799550106094';

    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${this.AUTH_KEY}&route=4&sender=${this.SENDER}&message=${encodeURIComponent(smsContent)}&DLT_TE_ID=${dltTemplateId}`;

    return this.sendSms(url, phone, 'OTP');
  }

  private async sendPaymentSms(job: Job<any, any, string>): Promise<any> {
    const { phone, orderId } = job.data;

    if (!phone || !orderId) {
      const error = new Error(
        `Missing required data for payment SMS: phone=${phone}, orderId=${orderId}`,
      );
      console.error('TextQueueProcessor: Invalid payment SMS job data', error);
      throw error;
    }

    const mobileNo = `91${phone}`;
    const templateId = '6949840842b20529c003ca35';
console.log(orderId)
    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${this.AUTH_KEY}&route=4&sender=${this.SENDER}&template_id=${templateId}&req_id=${encodeURIComponent(orderId)}`;

    return this.sendSms(url, phone, 'Payment');
  }

  private async sendAdminPaymentSms(job: Job<any, any, string>): Promise<any> {
    const { user_name, reason, req_url, phone } = job.data;

    if (!phone) {
      const error = new Error('Missing required data: phone');
      console.error(
        'TextQueueProcessor: Invalid admin payment SMS job data',
        error,
      );
      throw error;
    }

    const mobileNo = `91${phone}`;
    const templateId = '695210a19f204c2cd426feb3';

    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${this.AUTH_KEY}&route=4&sender=${this.SENDER}&template_id=${templateId}&var1=${encodeURIComponent(user_name || '')}&var2=${encodeURIComponent(reason || '')}&var3=${encodeURIComponent(req_url || '')}`;

    return this.sendSms(url, phone, 'Admin Payment Notification');
  }

  private async sendResponseCreatedSms(
    job: Job<any, any, string>,
  ): Promise<any> {
    const { phone, req_id, req_url } = job.data;
    if (!phone || !req_id || !req_url) {
      return {
        success: 0,
        message: 'Missing required data for response created SMS',
      };
    }

    const mobileNo = `91${phone}`;
    const templateId = '6952107d843e98330428d583';
    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${this.AUTH_KEY}&route=4&sender=${this.SENDER}&template_id=${templateId}&var1=${encodeURIComponent(req_id)}&var2=${encodeURIComponent(req_url)}`;

    return this.sendSms(url, phone, 'Response Created');
  }

  private async sendSms(
    url: string,
    phone: string,
    smsType: string,
  ): Promise<any> {
    try {
      const res = await fetch(url);
      const responseText = await res.text();

      if (!res.ok) {
        throw new Error(
          `msg91 API error: ${res.status} ${res.statusText} - ${responseText}`,
        );
      }

      if (
        responseText.toLowerCase().includes('invalid') ||
        responseText.toLowerCase().includes('error') ||
        responseText.toLowerCase().includes('failed')
      ) {
        return {
          success: 0,
          message: `msg91 API returned error: ${responseText}`,
        };
      }

      return { success: true, response: responseText };
    } catch (error) {
      console.error(`TextQueueProcessor: Failed to send ${smsType} SMS`, {
        phone,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
