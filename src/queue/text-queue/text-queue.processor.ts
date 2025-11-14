import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('text')
export class TextQueueProcessor extends WorkerHost {
  constructor() {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    let { phone, code } = job.data;

    // Basic logging to help debug whether the job is being processed
    console.log('TextQueueProcessor: processing job', { phone, code });

    const authKey = '272160A7NN1J35i5cb096b1'; // Replace with your actual auth key
    const mobileNo = `91${phone}`;
    const smsContent = `Dear user, your OTP for login is ${code}. Use this password to validate you login. SecondAid`;

    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${authKey}&route=4&sender=SECAID&message=${encodeURIComponent(smsContent)}&DLT_TE_ID=1307162799550106094`;

    try {
      const res = await fetch(url as any);
      try {
        const text = await res.text();
        console.log('TextQueueProcessor: msg91 response', { ok: res.ok, status: res.status, body: text.slice(0, 200) });
      } catch (e) {
        console.log('TextQueueProcessor: msg91 response received but failed to read body', e);
      }
    } catch (error) {
      console.log('TextQueueProcessor: fetch error', error);
    }
  }
}
