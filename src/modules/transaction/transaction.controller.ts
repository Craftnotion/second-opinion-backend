import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { JwtGuard } from '@/guards/jwt/jwt.guard';

import { TransactionDto } from './dto/transaction.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
// import { AuthRequest } from '@/types/request';

@Controller('transaction')
@ApiTags('Transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @ApiOperation({ summary: 'Create Razorpay Order for Popup Payment' })
  @ApiBody({ type: TransactionDto })
  @ApiConsumes('application/x-www-form-urlencoded')
  // @UseGuards(JwtGuard)
  @Post('create-order')
  async CreateOrder(@Body() Body: TransactionDto) {
    return await this.transactionService.CreateOrder(Body);
  }

  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiConsumes('application/json')
  @Post('verify')
  async VerifyPayment(@Body() Body: VerifyPaymentDto) {
    return await this.transactionService.VerifyPayment(Body);
  }

  @ApiOperation({ summary: 'Razorpay webhook' })
  @ApiBody({ type: Object })
  @ApiConsumes('application/json')
  @Post('webhook')
  async WebhookPost(
    @Body() Body: any,
    @Headers('x-razorpay-signature') xRazorpaySignature: string,
    @Res() res: any,
  ) {
    const result = await this.transactionService.VerifyPaymentViaWebhook(
      Body,
      xRazorpaySignature,
    );

    // Return proper HTTP status codes for Razorpay
    if (result.success === 1) {
      return res.status(200).json({ status: 'success' });
    } else {
      return res
        .status(400)
        .json({ status: 'failed', message: result.message });
    }
  }
}
