import { IsOptional, IsString } from 'class-validator';

export class OpinionDto {
  @IsOptional()
  @IsString()
  specialistName: string;

  @IsString()
  qualification: string;

  @IsString()
  hospital: string;

  @IsString()
  summary: string;

  @IsString()
  requestId: string;
}
