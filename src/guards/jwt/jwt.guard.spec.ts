import { JwtGuard } from '@/guards/jwt/jwt.guard';
import { JwtService } from '@nestjs/jwt';

describe('JwtGuard', () => {
  it('should be defined', () => {
    expect(new JwtGuard(new JwtService())).toBeDefined();
  });
});
