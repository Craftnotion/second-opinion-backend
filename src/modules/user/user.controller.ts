import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { LoginRequest } from 'src/types/request';
import { requestDto } from './dto/request.dto';
import { JwtGuard } from 'src/guards/jwt/jwt.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { filterDto } from '../utils/param-filter.dto';

@Controller('user')
@ApiTags('User')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'updating employee account' })
  // @ApiConsumes('multipart/form-data')
  @ApiBody({ type: requestDto })
  @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @Put('update')
  async updateUser(@Req() req: LoginRequest, @Body() requestDto: requestDto) {
    return await this.userService.update(req, requestDto);
  }

  @ApiOperation({ summary: 'creating a request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: requestDto })
  @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioFile', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
  )
  @Post('requests')
  async createRequest(
    @Req() req: LoginRequest,
    @Body() requestDto: requestDto,
    @UploadedFiles()
    files: {
      audioFile: Express.Multer.File[];
      documents: Express.Multer.File[];
    },
  ) {
    return await this.userService.requests(req, requestDto, files);
  }

  @Get('requests')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'getting all requests' })
  @ApiQuery({ type: filterDto })
  async getRequests(
    @Query() paramsFilter: filterDto,
    @Req() req: LoginRequest,
  ) {
    return await this.userService.getRequests(paramsFilter, req);
  }
}
