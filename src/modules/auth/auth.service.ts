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
  ) { }

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
      if (!user) {
        return {
          success: 0,
          message: 'common.auth.login.not_admin',
        };
      }
    }

    if (!user && type === 'user') {
      const user = new User();
      user.phone = phone;
      user.role = 'user';
      await this.userRepository.save(user);
    }
    if (!otp) {
      let code = await this.codeService.generateOTP(phone, 'phone');
      try {
        await this.textQueue.add('send-sms', { phone, code });
        console.log('AuthService: SMS job added to queue', { phone, code });
      } catch (error) {
        console.error('AuthService: Failed to add SMS job to queue', {
          phone,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue anyway - OTP is still generated and returned
      }
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
    customer.full_name = full_name;
    customer.phone = phone;
    customer.location = location;

    // Normalize email values for comparison (handle null, undefined, empty string)
    const currentEmail = customer.email?.trim() || null;
    const newEmail = email?.trim() || null;

    // Check if email is being updated (different from current email)
    if (newEmail && newEmail !== currentEmail) {
      console.log('Email update detected:', { currentEmail, newEmail, hasOtp: !!otp });

      if (otp) {
        const isValid = await this.codeService.verifyOTP(newEmail, otp, 'email');
        if (!isValid) {
          return {
            success: 0,
            message: 'common.auth.failed',
          };
        }
        customer.email = newEmail;
        await this.userRepository.save(customer);
        return {
          success: 1,
          message: 'common.profile.uptodate',
          data: {
            user: customer,
          },
        };
      } else {
        try {
          console.log('Generating OTP for email:', newEmail);
          const code = await this.codeService.generateOTP(newEmail, 'email');
          console.log('OTP generated successfully:', code);
          await this.mailService.otpMail({ otp: code, identity: newEmail });
          console.log('OTP email queued successfully');
          return {
            success: 2,
            message: 'common.profile.verify_email_sent',
            data: {
              otp: code,
            },
          };
        } catch (error) {
          console.error('Error generating OTP:', error);
          return {
            success: 0,
            message: 'common.auth.failed',
          };
        }
      }
    }

    await this.userRepository.save(customer);
    return {
      success: 1,
      message: 'common.profile.uptodate',
      data: {
        user: customer,
      },
    };
  }
}
