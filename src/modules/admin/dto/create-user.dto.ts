import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsString, Length, MinLength } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class CreateUserDto {

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  avatar: string | Express.Multer.File;

  @ApiProperty({required: true})
  @IsString({ message: i18nValidationMessage('validation.full_name.required') })
  @MinLength(3, {message: i18nValidationMessage('validation.full_name.min', { min: 3 })})
  full_name: string;


  @ApiProperty({required: true})
  @IsString({message: i18nValidationMessage('validation.email.required')})
  @MinLength(3, {message: i18nValidationMessage('validation.email.min', { min: 3 })})
  email: string;

  @ApiProperty({required: true})
  @IsString()
  @MinLength(10)
  phone: string;

}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
