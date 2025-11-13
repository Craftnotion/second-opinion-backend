import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { Requests } from 'src/database/entities/request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Requests]), AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
