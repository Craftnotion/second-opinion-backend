import { IsOptional, IsString } from 'class-validator';

export class loginDto {
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  otp?: string;

  @IsString()
  type: string;
}
