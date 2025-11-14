import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class TransactionDto {
  @IsString({ message: i18nValidationMessage('validation.amount.required') })
  @ApiProperty()
  amount: string;

  @IsString({
    message: i18nValidationMessage('validation.payment_reference.required'),
  })
  @ApiProperty()
  payment_reference: string;

  @IsString({ message: i18nValidationMessage('validation.callback.required') })
  @ApiProperty()
  callback: string;

  @IsString()
  @ApiProperty()
  id: string;
}
