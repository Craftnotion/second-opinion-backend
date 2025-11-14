import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { TextQueueModule } from './queue/text-queue/text-queue.module';
import { MailQueueModule } from './queue/email-queue/email-queue.module';
import { ConfigModule } from '@nestjs/config';
import { HashService } from './services/hash/hash.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormAsyncConfig } from './config/typeorm.config';
import { Client as OneSignalClient } from 'onesignal-node';
import { StringService } from './services/string/string.service';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';
import { FileService } from './services/file/file.service';
import { CommonSubscriber } from './database/subscribers/common.subscriber';
import { UniqueIdGenerator } from './services/uid-generator/uid-generator.service';
import { TransactionModule } from './modules/transaction/transaction.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './response.interceptor';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env.production', '.env'],
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(process.cwd(), 'src', 'i18n'),
        watch: true,
      },
      resolvers: [
        new QueryResolver(['lang', 'l']),
        new HeaderResolver(['x-custom-lang']),
        AcceptLanguageResolver,
      ],
    }),
    TypeOrmModule.forRootAsync(typeormAsyncConfig),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    JwtModule.register({
      secret: 'secret',
      signOptions: {
        expiresIn: '7d',
      },
      global: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    UserModule,
    AuthModule,
    AdminModule,
    TextQueueModule,
    MailQueueModule,
    TransactionModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    HashService,
    StringService,
    FileService,
    CommonSubscriber,
    {
      provide: 'doctor',
      useFactory: () => {
        return new OneSignalClient(
          '3b9a7005-24ff-4a27-90bb-58f96a4c7739',
          'YTQ1ODQ0MmEtMmM5ZC00MGM3LTkwMTctNjFkNzhiNTgxN2Rh',
        );
      },
    },
    {
      provide: 'patient',
      useFactory: () => {
        return new OneSignalClient(
          'd9450566-2405-403a-94f6-f16cbabb3e42',
          'YjQ4NDEyOWMtNDBjZS00NmNhLTk2MjAtYzQxZjcxOGM1ODI2',
        );
      },
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
