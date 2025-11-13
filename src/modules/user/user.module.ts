import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { Requests } from 'src/database/entities/request.entity';
import { Document } from 'src/database/entities/document.entity';
import { UniqueIdGenerator } from 'src/services/uid-generator/uid-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Requests, Document]), AuthModule],
  controllers: [UserController],
  providers: [UserService, UniqueIdGenerator],
  exports: [UserService],
})
export class UserModule {}
