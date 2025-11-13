import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AdminService } from './admin.service';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from 'src/guards/jwt/jwt.guard';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
}
