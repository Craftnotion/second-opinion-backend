import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from 'src/database/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HashService } from 'src/services/hash/hash.service';
import { JwtService } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { Code } from 'src/database/entities/code.entity';
import { CodeService } from 'src/services/code/code.service';
import { StringService } from 'src/services/string/string.service';
import { MailQueueModule } from 'src/queue/email-queue/email-queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Code]),
    ConfigModule,
    BullModule.registerQueue({
      name: 'text',
    }),
    MailQueueModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, HashService, JwtService, CodeService, StringService],
  exports: [AuthService],
})
export class AuthModule {}


