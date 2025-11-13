import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { HashService } from './services/hash/hash.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormAsyncConfig } from './config/typeorm.config';

 

@Module({
  imports: [
     ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env.production', '.env'],
    }),
    TypeOrmModule.forRootAsync(typeormAsyncConfig),
    JwtModule.register({
      secret:'secret',
      signOptions:{
        expiresIn:'7d'
      },
      global:true
    }),
    UserModule, AuthModule, AdminModule],
    
  controllers: [AppController],
  providers: [AppService, HashService],
})
export class AppModule {}
