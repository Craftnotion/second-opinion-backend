import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as config from 'config';
import { configObject, HttpResponse, requestPayload } from 'src/types/types';
@Injectable()
export class JwtCheckInGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({ message: 'auth.token.notProvided' });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.get<configObject>('jwt').secret,
      });

      request['user'] = payload as requestPayload;
      console.log('Check-in JWT payload:', request['user']);
    } catch (err) {
      throw new UnauthorizedException({
        success: 5,
        message: 'Token is invalid or expired',
      });
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
