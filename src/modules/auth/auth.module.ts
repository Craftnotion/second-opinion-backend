import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from 'src/database/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HashService } from 'src/services/hash/hash.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports:[  TypeOrmModule.forFeature([User]), 
 ConfigModule
],
  controllers: [AuthController],
  providers: [AuthService, HashService, JwtService],
  exports:[AuthService]
})
export class AuthModule {}
