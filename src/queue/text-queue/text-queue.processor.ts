import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('text')
export class TextQueueProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    let { phone, code } = job.data;

    const authKey = '272160A7NN1J35i5cb096b1'; // Replace with your actual auth key
    const mobileNo = `91${phone}`;
    const smsContent = `Dear user, your OTP for login is ${code}. Use this password to validate your login. SecondAid`;

    const url = `https://api.msg91.com/api/sendhttp.php?mobiles=${encodeURIComponent(mobileNo)}&authkey=${authKey}&route=4&sender=SECAID&message=${encodeURIComponent(smsContent)}&DLT_TE_ID=1307162799550106094`;

    try {
      let res = await fetch(url);
      let data = await res.text();
      console.log('sms response', data);
    } catch (error) {
      console.log('err', error);
    }
  }
}
