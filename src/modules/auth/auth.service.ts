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
import { MailService } from 'src/services/email/email.service';
import { loginDto } from './dto/login.dto';
import { requestDto } from '../user/dto/request.dto';
import { LoginRequest } from 'src/types/request';

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
    private readonly mailService: MailService,
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
    } else if (type === 'admin') {
      user = await this.userRepository.findOne({
        where: { phone, role: 'admin' },
      });
      console.log('admin user', user);
    }

    if (!user && type === 'user') {
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
    const { email, full_name, phone, location, otp } = requestDto;
    const customer = await this.userRepository.findOneOrFail({
      where: { id: req.user.id },
    });
    customer.email === null ||
      customer.full_name === null ||
      customer.phone === null ||
      customer.location === null;
    customer.full_name = full_name;
    customer.phone = phone;
    customer.location = location;

    if (email && email !== customer.email) {
      console.log('email provided');

      if (otp) {
        const isValid = await this.codeService.verifyOTP(email, otp, 'email');
        if (!isValid) {
          return {
            success: 0,
            message: 'common.auth.failed',
          };
        }
        customer.email = email;
        await this.userRepository.save(customer);
        const token = await this.GenerateToken(instanceToPlain(customer), '7d');
        return {
          success: 2,
          message: 'common.profile.verify_email_sent',
          data: {
            user: customer,
            token,
          },
        };
      } else {
        const code = await this.codeService.generateOTP(email, 'email');
        await this.mailService.otpMail({ otp: code, identity: email });
        return {
          success: 2,
          message: 'common.profile.verify_email_sent',
          data: {
            otp: code,
          },
        };
      }
    }

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
