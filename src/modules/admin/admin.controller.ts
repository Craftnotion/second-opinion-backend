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
  Query,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { AdminService } from './admin.service';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { JwtGuard } from 'src/guards/jwt/jwt.guard';
import { filterDto } from '../utils/param-filter.dto';
import { LoginRequest } from 'src/types/request';
import { OpinionDto } from './dto/opinion.dto';
import { requestDto } from '../user/dto/request.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('requests')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'getting all requests' })
  @ApiQuery({ type: filterDto })
  async getRequests(
    @Query() paramsFilter: filterDto,
    @Req() req: LoginRequest,
  ) {
    return await this.adminService.getRequests(paramsFilter, req);
  }

  @ApiOperation({ summary: 'creating a request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: OpinionDto })
  @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioFile', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
  )
  @Post('opinion')
  async createRequest(
    @Body() opinionDto: OpinionDto,
    @UploadedFiles()
    files: {
      audioFile: Express.Multer.File[];
      documents: Express.Multer.File[];
    },
  ) {
    return await this.adminService.opinion(opinionDto, files);
  }

  @Get('requests/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'getting request by id' })
  async getRequestById(@Req() req: LoginRequest, @Param('id') id: string) {
    return await this.adminService.getRequestById(id, req);
  }
}
