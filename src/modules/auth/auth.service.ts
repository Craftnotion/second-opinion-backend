import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminLoginDto } from './dto/admin-login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { instanceToPlain } from 'class-transformer';
import { Repository } from 'typeorm';
import { HashService } from '../../services/hash/hash.service';
import { JwtService } from '@nestjs/jwt';
import * as config from 'config';
import { configObject } from 'src/types/types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CodeService } from 'src/services/code/code.service';
import { loginDto } from './dto/login.dto';
import { requestDto } from '../user/dto/request.dto';
import { LoginRequest } from 'src/types/request';
import e from 'express';
const JwtConfig = config.get<configObject>('jwt');
@Injectable()
export class AuthService {
  constructor(
    @InjectQueue('text') private readonly textQueue: Queue,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly hashService: HashService,
    private readonly codeService: CodeService,
  ) {}

  async GenerateToken(data: any, time: string = '100d'): Promise<string> {
    // Ensure payload is a plain object. Convert class instances to plain objects
    // and wrap non-object values so jsonwebtoken receives a plain object.
    const payload =
      data && typeof data === 'object' ? instanceToPlain(data) : { data };

    return this.jwtService.sign(
      payload as any,
      {
        secret: JwtConfig.secret,
        expiresIn: `${time}`,
        algorithm: 'HS256',
      } as any,
    );
  }

  async login(data: loginDto) {
    const { phone, otp, type } = data;
    let user;
    if (type === 'user') {
      user = await this.userRepository.findOne({
        where: { phone, role: 'user' },
      });
    } else {
      user = await this.userRepository.findOne({
        where: { phone, role: 'admin' },
      });
    }

    if (!user) {
      console.log('Creating user');
      const user = new User();
      user.phone = phone;
      user.role = 'user';
      await this.userRepository.save(user);
    }
    if (!otp) {
      let code = await this.codeService.generateOTP(phone, 'phone');
      await this.textQueue.add('send-sms', { phone, code });
      return {
        success: 2,
        message: 'common.auth.login.send_otp',
        data: code,
      };
    }
    const isCodeValid = await this.codeService.verifyOTP(phone, otp, 'phone');
    if (!isCodeValid) {
      return {
        success: 0,
        message: 'common.auth.failed',
      };
    }
    const token = await this.GenerateToken(instanceToPlain(user), '7d');
    return {
      success: 1,
      message: 'common.auth.login.successful',
      data: {
        user: user,
        token,
      },
    };
  }

  async update(req: LoginRequest, requestDto: requestDto) {
    const { email, full_name, phone, location } = requestDto;
    const customer = await this.userRepository.findOneOrFail({
      where: { id: req.user.id },
    });
    customer?.email === null ||
      customer?.full_name === null ||
      customer?.phone === null ||
      customer?.location === null;

    if (email) {
      customer.email = email;
    }

    customer.full_name = full_name;

    customer.phone = phone;

    customer.location = location;

    await this.userRepository.save(customer);
    const token = await this.GenerateToken(instanceToPlain(customer), '7d');
    return {
      success: 1,
      message: 'common.profile.uptodate',
      data: {
        user: customer,
        token,
      },
    };
  }
}
