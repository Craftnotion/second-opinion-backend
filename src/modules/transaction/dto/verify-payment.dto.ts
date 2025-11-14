import { IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VerifyPaymentDto {
  @IsString({
    message: i18nValidationMessage('validation.razorpay_payment_id.required'),
  })
  razorpay_payment_id: string;

  @IsString({
    message: i18nValidationMessage('validation.razorpay_order_id.required'),
  })
  razorpay_order_id: string;

  @IsString({
    message: i18nValidationMessage('validation.razorpay_signature.required'),
  })
  razorpay_signature: string;
}



