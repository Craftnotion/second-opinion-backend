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
const JwtConfig = config.get<configObject>('jwt');
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly hashService: HashService,
  ) {}

  async GenerateToken(data: any, time: string = '100d'): Promise<string> {
    // Ensure payload is a plain object. Convert class instances to plain objects
    // and wrap non-object values so jsonwebtoken receives a plain object.
    const payload =
      data && typeof data === 'object' ? instanceToPlain(data) : { data };
      
    return this.jwtService.sign(payload as any, {
      secret: JwtConfig.secret,
      expiresIn: `${time}`,
      algorithm: 'HS256',
    } as any);
  }

  async adminLogin(request: AdminLoginDto) {
    const { email, password, user_type } = request;
    const user = await this.userRepository.findOne({
      where: { email, role: user_type },
    });

    if (user && user.role === 'admin' && user.password === password) {
      const token = await this.GenerateToken(instanceToPlain(user), '7d');
      return {
        success: 1,
        message: 'common.auth.successful',
        data: {
          user: user,
          token,
        },
      };
    } else if (user) {
      const isPasswordValid = await this.hashService.comparePassword(
        password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException({
          success: 0,
          message: 'common.auth.failed',
        });
      }
      const token = await this.GenerateToken(instanceToPlain(user), '7d');
      return {
        success: 1,
        message: 'common.auth.successful',
        data: {
          user: user,
          token,
        },
      };
    } else {
      throw new UnauthorizedException({
        success: 0,
        message: 'common.auth.failed',
      });
    }
  }
}
