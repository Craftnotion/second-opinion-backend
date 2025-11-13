export class CreateAuthDto {}
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AdminLoginDto {
  @IsString({ message: i18nValidationMessage('validation.email.email') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.email.required') })
  @ApiProperty({ required: true })
  email: string;

  @ApiProperty({ required: true })
  @IsString({ message: i18nValidationMessage('validation.password.required') })
  @IsNotEmpty({
    message: i18nValidationMessage('validation.password.required'),
  })
  password: string;

  @ApiProperty({ required: true })
  @IsString({ message: i18nValidationMessage('validation.user.type') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.user.type') })
  user_type: string;
}
