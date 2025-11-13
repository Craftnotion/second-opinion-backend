import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class filterDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => String)
  search?: string;

  @IsOptional()
  @Type(() => String)
  status?: string;
}
