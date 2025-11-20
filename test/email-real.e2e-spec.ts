import { Test, TestingModule } from '@nestjs/testing';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { join } from 'path';
import { MailerConfig } from '../src/config/email.config';
import { StringService } from '../src/services/string/string.service';
import { MailService } from '../src/services/email/email.service';
import { getQueueToken } from '@nestjs/bullmq';

jest.setTimeout(60000);

describe('MailService real SMTP (e2e)', () => {
  let mailService: MailService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.development', '.env'],
        }),
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          loaderOptions: {
            path: join(process.cwd(), 'src', 'i18n'),
            watch: false,
          },
          resolvers: [],
        }),
        MailerModule.forRoot(MailerConfig),
      ],
      providers: [
        StringService,
        MailService,
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    mailService = moduleFixture.get(MailService);
  });

  it('should send OTP email via real SMTP provider', async () => {
    const payload = {
      type: 'otp',
      identity: 'sharmahimanshu0405@gmail.com',
      otp: '123456',
    };

    await expect(mailService.handleJob(payload)).resolves.toBeUndefined();
  });
});

