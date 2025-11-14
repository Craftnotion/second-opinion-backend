import { IsOptional, IsString } from 'class-validator';

export class requestDto {
  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  full_name: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  otp: string;

  @IsString()
  @IsOptional()
  location: string;

  @IsString()
  @IsOptional()
  specialty: string;

  @IsString()
  @IsOptional()
  request: string;

  @IsString()
  @IsOptional()
  urgency: string;

  @IsString()
  @IsOptional()
  cost: string;
}
