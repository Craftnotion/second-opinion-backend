import {
  Body,
  Controller,
  Get,
  Post,
  Put,
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
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @Post('requests')
  @UseInterceptors(FileInterceptor('avatar'))
  async createRequest(
    @Req() req: LoginRequest,
    @Body() requestDto: requestDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return await this.userService.requests(req, requestDto, avatar);
  }
}
