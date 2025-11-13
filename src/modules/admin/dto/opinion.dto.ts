import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class OpinionDto {
  @IsString()
  specialistName: string;

  @IsString()
  qualification: string;

  @IsString()
  hospital: string;

  @IsString()
  summary: string;

  @IsString()
  requestId: number;
}
