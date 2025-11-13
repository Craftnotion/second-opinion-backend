import {
  Controller,
  Get,
  Post,
  Body,
 
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

  ) {}

  @ApiOperation({ summary: 'admin login' })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({
    type: AdminLoginDto,
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('login')
  async adminLogin(@Body() body: AdminLoginDto) {
    return await this.authService.adminLogin(body);
  }



  
}
