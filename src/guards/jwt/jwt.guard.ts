import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as config from 'config';
import { configObject } from 'src/types/types';
import { UserData } from 'src/types/user';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException({ message: 'auth.token.notProvided' });
    }
    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: config.get<configObject>('jwt').secret
        }
      );

      request['user'] = payload as UserData;

    } catch (err) {
      throw new UnauthorizedException({ message: 'auth.token.invalid' });
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
