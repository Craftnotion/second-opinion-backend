import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { HashService } from 'src/services/hash/hash.service';
import { User } from 'src/database/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports:[UserModule,AuthModule,
    TypeOrmModule.forFeature([User]),

  ],
  controllers: [AdminController],
  providers: [AdminService, HashService],
})
export class AdminModule {}
