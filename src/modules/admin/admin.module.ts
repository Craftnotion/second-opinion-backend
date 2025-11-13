import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { HashService } from 'src/services/hash/hash.service';
import { User } from 'src/database/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Opinion } from 'src/database/entities/opinion.entity';
import { opinionDocument } from 'src/database/entities/opinion-document.entity';

@Module({
  imports: [
    UserModule,
    AuthModule,
    TypeOrmModule.forFeature([User, Opinion, opinionDocument]),
  ],
  controllers: [AdminController],
  providers: [AdminService, HashService],
})
export class AdminModule {}
