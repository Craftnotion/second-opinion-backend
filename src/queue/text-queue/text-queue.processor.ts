import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('text')
export class TextQueueProcessor extends WorkerHost {
  constructor() {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    let { phone, code } = job.data;

    if (!phone || !code) {
      const error = new Error(
        `Missing required data: phone=${phone}, code=${code}`,
      );
      console.error('TextQueueProcessor: Invalid job data', error);
      throw error;
    }

    const authKey = '272160A7NN1J35i5cb096b1'; // Replace with your actual auth key
    const mobileNo = `91${phone}`;
    const smsContent = `Dear user, your OTP for login is ${code}. Use this password to validate you login. SecondAid`;

    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${authKey}&route=4&sender=SECAID&message=${encodeURIComponent(smsContent)}&DLT_TE_ID=1307162799550106094`;

    try {
      const res = await fetch(url);
      const responseText = await res.text();

      // msg91 returns different response codes
      // Success responses typically contain "SMS sent successfully" or a request ID
      if (!res.ok) {
        throw new Error(
          `msg91 API error: ${res.status} ${res.statusText} - ${responseText}`,
        );
      }

      // Check if response indicates failure
      if (
        responseText.includes('Invalid') ||
        responseText.includes('error') ||
        responseText.includes('failed')
      ) {
        throw new Error(`msg91 API returned error: ${responseText}`);
      }

      return { success: true, response: responseText };
    } catch (error) {
      console.error('TextQueueProcessor: Failed to send SMS', {
        phone,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to mark job as failed
    }
  }
}
