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
      console.log('Processing send-sms job:', job.data);
      return this.sendOtpSms(job);
    } else if (name === 'send-payment-sms') {
      console.log('Processing send-payment-sms job:', job.data);
      return this.sendPaymentSms(job);
    } else if (name === 'send-to-admin-payment-sms') {
      console.log('Processing send-to-admin-payment-sms job:', job.data);
      return this.sendAdminPaymentSms(job);
    } else if (name === 'response-created') {
      console.log('Processing response-created job:', job.data);
      return this.sendOpinionResponseSms(job);
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

    // Using MSG91 Flow API v5 for template-based SMS
    const url = 'https://control.msg91.com/api/v5/flow';
    const payload = {
      template_id: templateId,
      short_url: '0',
      realTimeResponse: '1',
      recipients: [
        {
          mobiles: mobileNo,
          req_id: orderId,
        },
      ],
    };

    return this.sendSmsViaFlowApi(url, payload, phone, 'Payment');
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

    // Try the direct send API instead of flow API
    const url = 'https://control.msg91.com/api/v5/flow/';
    const payload = {
      flow_id: templateId,
      sender: this.SENDER,
      mobiles: mobileNo,
      user_name: user_name || 'Test User',
      reason: reason || 'Test Reason',
      req_url: req_url || 'https://test.com',
    };

    console.log(
      'Sending Admin Payment SMS with payload:',
      JSON.stringify(payload, null, 2),
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authkey: this.AUTH_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      console.log(
        'Admin Payment Notification SMS API Response:',
        JSON.stringify(responseData, null, 2),
      );

      if (!res.ok || responseData.type === 'error') {
        throw new Error(`msg91 API error: ${JSON.stringify(responseData)}`);
      }

      return { success: true, response: responseData };
    } catch (error) {
      console.error('Failed to send Admin Payment SMS', {
        phone,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
        throw new Error(`msg91 API returned error: ${responseText}`);
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

  async sendOpinionResponseSms(job: Job<any, any, string>): Promise<any> {
    const { phone, req_id, req_url } = job.data;

    if (!phone || !req_id || !req_url) {
      const error = new Error(
        `Missing required data for opinion response SMS: phone=${phone}, req_id=${req_id}, req_url=${req_url}`,
      );
      console.error(
        'TextQueueProcessor: Invalid opinion response SMS job data',
        error,
      );
      throw error;
    }

    const mobileNo = `91${phone}`;
    const templateId = '6952107d843e98330428d583';

    // Using MSG91 Flow API v5 for template-based SMS
    const url = 'https://control.msg91.com/api/v5/flow';
    const payload = {
      template_id: templateId,
      short_url: '0',
      realTimeResponse: '1',
      recipients: [
        {
          mobiles: mobileNo,
          req_id: req_id,
          req_url: req_url,
        },
      ],
    };

    console.log('Sending Opinion Response SMS with payload:', payload);

    return this.sendSmsViaFlowApi(url, payload, phone, 'Opinion Response');
  }

  private async sendSmsViaFlowApi(
    url: string,
    payload: any,
    phone: string,
    smsType: string,
  ): Promise<any> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authkey: this.AUTH_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      // Log full response for debugging
      console.log(
        `${smsType} SMS API Response:`,
        JSON.stringify(responseData, null, 2),
      );

      if (!res.ok) {
        throw new Error(
          `msg91 Flow API error: ${res.status} ${res.statusText} - ${JSON.stringify(responseData)}`,
        );
      }

      if (
        responseData.type === 'error' ||
        responseData.message?.toLowerCase().includes('error')
      ) {
        throw new Error(
          `msg91 Flow API returned error: ${responseData.message || JSON.stringify(responseData)}`,
        );
      }

      return { success: true, response: responseData };
    } catch (error) {
      console.error(
        `TextQueueProcessor: Failed to send ${smsType} SMS via Flow API`,
        {
          phone,
          payload: JSON.stringify(payload),
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
