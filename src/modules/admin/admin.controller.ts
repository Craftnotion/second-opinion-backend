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
import { JwtCheckInGuard } from 'src/guards/opinion-jwt-guard/opinion.guard';
import { CheckInRequest, requestPayload } from 'src/types/types';
import { Is } from 'src/guards/acl/acl.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('requests')
  @UseGuards(JwtGuard,Is('admin'))
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'getting all requests' })
  @ApiQuery({ type: filterDto })
  async getRequests(
    @Query() paramsFilter: filterDto,
    @Req() req: LoginRequest,
  ) {
    return await this.adminService.getRequests(paramsFilter, req);
  }

  @ApiOperation({ summary: 'creating an opinion for the request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: OpinionDto })
  @UseGuards(JwtGuard,Is('admin'))
  @ApiBearerAuth('authorization')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioFile', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
  )
  @Post('opinion')
  async createOpinion(
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
  @UseGuards(JwtGuard,Is('admin'))
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'getting request by id' })
  async getRequestById(@Req() req: LoginRequest, @Param('id') id: string) {
    return await this.adminService.getRequestById(id, req);
  }

  @Post('generate-link/:slug')
  // @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'generating link for request' })
  async generateLink(@Param('slug') slug: string) {
    return await this.adminService.linkGenerator(slug);
  }

  @Get('/opinion')
  @UseGuards(JwtCheckInGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'getting opinion by token' })
  async getOpinionByToken(@Req() req: CheckInRequest) {
    return await this.adminService.getRequestByIdTemp(
      req.user.request.requestSlug,
      req.user.request.userId,
    );
  }

  @Post('/opinion/submit')
  @UseGuards(JwtCheckInGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'submitting opinion by token' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioFile', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
  )
  async submitOpinionByToken(
    @Req() req: CheckInRequest,
    @Body() opinionDto: OpinionDto,
    @UploadedFiles()
    files: {
      audioFile: Express.Multer.File[];
      documents: Express.Multer.File[];
    },
  ) {
    return await this.adminService.opinion(opinionDto, files);
  }
}
