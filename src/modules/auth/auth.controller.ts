import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { loginDto } from './dto/login.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'admin login' })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({
    type: loginDto,
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('login')
  async adminLogin(@Body() body: loginDto) {
    return await this.authService.login(body);
  }
}
