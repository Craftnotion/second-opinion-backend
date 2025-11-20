import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
// import { CreateTransactionDto } from './dto/transaction.dto';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as config from 'config';
// import { AuthRequest } from '@/types/request';
import * as crypto from 'crypto';
import { Transaction } from 'src/database/entities/transaction.entity';
import { UserService } from '../user/user.service';
import { HttpResponse, TransactionStatus } from 'src/types/types';
import { TransactionDto } from './dto/transaction.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MailService } from 'src/services/email/email.service';
const Razorpay = require('razorpay');

@Injectable()
export class TransactionService {
  private razorpay: any;

  private readonly logger = new Logger(TransactionService.name);
  private razorpayConfig = {
    api_key_id: 'rzp_test_RgosfgTam2peAi',
    api_key_secret: '1ltxnLg1m7VA5nZxDIE4EzpA',
    webhook_secret: 'NESTJSBACKEND@CTIVE!@#$%AUTHT',
    merchant_id: 'RB53YT2akk4wV2',
  };
  constructor(
    @InjectRepository(Transaction)
    private readonly TransactionRepository: Repository<Transaction>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly mailService: MailService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.razorpayConfig.api_key_id,
      key_secret: this.razorpayConfig.api_key_secret,
    });
  }
  async createOrderForRequest(
    userId: string,
    requestId: string,
    amount: string,
  ): Promise<Record<string, any>> {
    const user = await this.userService.getUserbyid(userId);
    const request = await this.userService.getRequestById(requestId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!request) {
      throw new Error('Request not found');
    }

    const transaction = this.TransactionRepository.create({
      user: user,
      amount: Number(amount),
      status: 'pending' as TransactionStatus,
      request_id: request.id,
    });
    const savedTransaction = await this.TransactionRepository.save(transaction);

    const options = {
      amount: Number(amount) * 100, // amount in the smallest currency unit
      currency: 'INR',
      receipt: `receipt_order_${savedTransaction.id}`,
      notes: {
        user_id: userId,
        transaction_id: savedTransaction.id,
        user_phone: user?.phone || '',
        user_name: user?.full_name || '',
        user_email: user?.email || '',
      },
    };

    const order = await this.razorpay.orders.create(options);
    console.log('Razorpay Order:', order);

    const transactionWithOrderId =
      await this.TransactionRepository.findOneOrFail({
        where: { id: savedTransaction.id },
      });
    transactionWithOrderId.razorpay_order_id = order.id;
    await this.TransactionRepository.save(transactionWithOrderId);

    return {
      id: order.id,
      merchant_id: this.razorpayConfig.merchant_id,
      entity: order.entity,
      amount: order.amount,
      amount_paid: order.amount_paid,
      amount_due: order.amount_due,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      attempts: order.attempts,
      created_at: order.created_at,
      key: this.razorpayConfig.api_key_id,
      transaction_id: savedTransaction.id,
    };
  }

  async CreateOrder(
    body: TransactionDto,
  ): Promise<HttpResponse<Record<string, any>>> {
    try {
      const orderData = await this.createOrderForRequest(
        body.Userid,
        body.requestId,
        body.amount,
      );

      return {
        success: 1,
        message: 'common.transaction.order.created',
        data: orderData,
      };
    } catch (error) {
      console.error('Error in CreateOrder:', error);
      throw error;
    }
  }

  async VerifyPaymentViaWebhook(Body: any, Header: string) {
    try {
      const razorpayHeaders = Header;
      const jsonBody = JSON.stringify(Body);

      const event = Body?.event ?? 'unknown';
      const paymentId = Body?.payload?.payment?.entity?.id;
      this.logger.log(
        `[WEBHOOK] Received event: ${event}${
          paymentId ? ` for payment ${paymentId}` : ''
        }`,
      );
      this.logger.debug(`[WEBHOOK] Headers: ${razorpayHeaders ?? 'undefined'}`);

      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayConfig.webhook_secret)
        .update(jsonBody)
        .digest('hex');
      this.logger.debug(`[WEBHOOK] Expected Signature: ${expectedSignature}`);
      this.logger.debug(
        `[WEBHOOK] Razorpay Signature: ${razorpayHeaders ?? 'undefined'}`,
      );
      if (expectedSignature !== razorpayHeaders) {
        this.logger.warn(
          `[WEBHOOK] Invalid signature for event ${event}. Expected ${expectedSignature}, received ${razorpayHeaders}`,
        );
        return { success: 0, message: 'Invalid signature' };
      }

      const { payload } = Body;
      if (
        event == 'payment.captured' ||
        event == 'payment.authorized' ||
        event == 'order.paid'
      ) {
        const payment = payload?.payment.entity;
        const paymentLink = payload?.payment_link?.entity;
        const order = payload?.order?.entity;
        if (!payment?.id) {
          // Payment ID is missing so obviously something is wrong
          return { success: 0, message: 'Payment ID not found in payload' };
        }

        //now we need to check is the transaction is already marked as paid or not
        const existingTransaction = await this.TransactionRepository.findOne({
          where: { razorpay_payment_id: payment.id },
        });

        if (existingTransaction) {
          this.logger.warn(
            `[WEBHOOK] Payment ${payment.id} already processed for transaction ${existingTransaction.id}`,
          );
          return {
            success: 1,
            message: 'common.transaction.already.completed',
          };
        }

        //now lets get our transaction id for our database from the notes which we sent while creating order
        let transactionId =
          payment.notes?.transaction_id ||
          order.notes?.transaction_id ||
          paymentLink.notes?.transaction_id;

        if (!transactionId && order.id) {
          //considering the case when notes are not present for some reason we will try to get the transaction via order id
          const transaction = await this.TransactionRepository.findOne({
            where: { razorpay_order_id: order.id },
          });
          if (transaction) {
            transactionId = transaction.id.toString();
          }
        }
        //NOT URE ABT THIS CASE
        if (!transactionId && paymentLink?.id) {
          const transaction = await this.TransactionRepository.findOne({
            where: { razorpay_order_id: paymentLink.id },
          });
          if (transaction) {
            transactionId = transaction.id.toString();
          }
        }

        if (!transactionId) {
          return {
            success: 0,
            message: 'Transaction ID not found in payment notes',
          };
        }
        const Transaction = await this.TransactionRepository.findOne({
          where: { id: parseInt(transactionId) },
        });

        if (!Transaction) {
          return { success: 0, message: 'Transaction not found' };
        }

        if (Transaction.status === 'completed') {
          return { success: 1, message: 'Transaction already completed' };
        }

        //now we need to update our transaction status to completed and save the razorpay payment id
        //Basically verifying the payment is successful

        try {
          const razorpayPayments = await this.razorpay.payments.fetch(
            payment.id,
          );
          this.logger.debug(
            `[WEBHOOK] Razorpay payment fetched: ${JSON.stringify(
              razorpayPayments,
            )}`,
          );

          if (
            (razorpayPayments.status === 'captured' ||
              razorpayPayments.status === 'authorized') &&
            razorpayPayments.amount === Transaction.amount * 100
          ) {
            if (razorpayPayments.status === 'authorized') {
              //capture the payment
              try {
                await this.razorpay.payments.capture(
                  payment.id,
                  razorpayPayments.amount,
                );
                const updatedPayment = await this.razorpay.payments.fetch(
                  payment.id,
                );
                if (updatedPayment.status !== 'captured') {
                  Transaction.status = 'failed';
                  await this.TransactionRepository.save(Transaction);
                  this.logger.error(
                    `[WEBHOOK] Payment ${payment.id} capture failed. Status: ${updatedPayment.status}`,
                  );
                  return { success: 0, message: 'Payment capture failed' };
                }
              } catch (error) {
                Transaction.status = 'failed';
                await this.TransactionRepository.save(Transaction);
                this.logger.error(
                  `[WEBHOOK] Error capturing payment ${payment.id}: ${
                    (error as Error)?.message ?? 'unknown error'
                  }`,
                );
                return { success: 0, message: 'Payment capture failed' };
              }
            }

            const previousStatus = Transaction.status;
            Transaction.status = 'completed';
            Transaction.razorpay_payment_id = payment.id;
            if (order?.id) {
              Transaction.razorpay_order_id = order.id;
            } else if (paymentLink?.id) {
              Transaction.razorpay_order_id = paymentLink.id;
            }

            await this.TransactionRepository.save(Transaction);

            await this.notifyPaymentSuccess(Transaction, previousStatus);
            this.logger.log(
              `[WEBHOOK] Payment ${payment.id} verified for transaction ${Transaction.id}`,
            );

            return { success: 1, message: 'Payment verified and captured' };
          } else {
            Transaction.status = 'failed';
            await this.TransactionRepository.save(Transaction);
            return { success: 0, message: 'Payment verification failed' };
          }
        } catch (error) {
          // If it's a "payment not found" error and transaction is already completed, just return success
          if (
            error.statusCode === 400 &&
            error.error?.code === 'BAD_REQUEST_ERROR' &&
            error.error?.description === 'The id provided does not exist' &&
            Transaction.status === 'completed'
          ) {
            return {
              success: 1,
              message: 'common.transaction.already.completed',
            };
          }

          // For other errors, mark as failed
          Transaction.status = 'failed';
          await this.TransactionRepository.save(Transaction);
          this.logger.error(
            `[WEBHOOK] Error verifying payment ${payment.id}: ${
              (error as Error)?.message ?? 'unknown error'
            }`,
          );
          return { success: 0, message: 'common.transaction.failed' };
        }
      }

      //now lets handle the failed payments
      if (event == 'payment.failed') {
        const payment = payload?.payment?.entity;
        const order = payload?.order?.entity;
        const paymentLink = payload.payment_link?.entity;

        let transactionId =
          payment?.notes?.transaction_id ||
          order?.notes?.transaction_id ||
          paymentLink?.notes?.transaction_id;

        // keep finding transaction id from order id if notes are not present
        if (!transactionId && order?.id) {
          const transaction = await this.TransactionRepository.findOne({
            where: { razorpay_order_id: order.id },
          });
          if (transaction) {
            transactionId = transaction.id.toString();
          }
        }

        if (!transactionId && paymentLink?.id) {
          const transaction = await this.TransactionRepository.findOne({
            where: { razorpay_order_id: paymentLink.id },
          });
          if (transaction) {
            transactionId = transaction.id.toString();
          }
        }

        if (transactionId) {
          const Transaction = await this.TransactionRepository.findOne({
            where: { id: parseInt(transactionId) },
          });

          if (Transaction && Transaction.status !== 'completed') {
            Transaction.status = 'failed';
            Transaction.razorpay_payment_id = payment?.id;
            if (order?.id) {
              // ✅ Add this
              Transaction.razorpay_order_id = order.id;
            } else if (paymentLink?.id) {
              Transaction.razorpay_order_id = paymentLink.id;
            }
            await this.TransactionRepository.save(Transaction);
          }
        }
        return { success: 1, message: 'common.transaction.failed' };
      }
      if (
        event === 'payment.dispute.created' ||
        event === 'payment.dispute.under_review' ||
        event === 'payment.dispute.action_required'
      ) {
        const order = payload.order.entity;

        // Extract transaction ID from receipt
        let transactionId;
        if (order.receipt.startsWith('receipt_order_')) {
          transactionId = order.receipt.replace('TBTRANS', '');
        } else {
          transactionId = order.receipt.replace('receipt_order_', '');
        }

        let Transaction = await this.TransactionRepository.findOne({
          where: { id: parseInt(transactionId) },
        });

        if (Transaction) {
          Transaction.status = 'failed';
          await this.TransactionRepository.save(Transaction);
        }
      }
      // Handle dispute resolved events
      if (
        event === 'payment.dispute.won' ||
        event === 'payment.dispute.lost' ||
        event === 'payment.dispute.closed'
      ) {
        const order = payload.order.entity;

        // Extract transaction ID from receipt
        const transactionId = order.receipt.replace('TBTRANS', '');

        const Transaction = await this.TransactionRepository.findOne({
          where: { id: parseInt(transactionId) },
        });

        if (Transaction) {
          if (event === 'payment.dispute.won') {
            const previousStatus = Transaction.status;
            Transaction.status = 'completed';
            await this.TransactionRepository.save(Transaction);
            await this.notifyPaymentSuccess(Transaction, previousStatus);
          } else {
            Transaction.status = 'failed';
            await this.TransactionRepository.save(Transaction);
          }
        }

        return { success: 1, message: 'common.transaction.dispute.resolved' };
      }

      // Handle order notification events
      if (
        event === 'order.notification.delivered' ||
        event === 'order.notification.failed'
      ) {
        // Log notification events but don't change transaction status
        return {
          success: 1,
          message: 'common.transaction.notification.logged',
        };
      }

      // Handle downtime events (log but don't change transaction status)
      if (
        event === 'payment.downtime.started' ||
        event === 'payment.downtime.updated' ||
        event === 'payment.downtime.resolved'
      ) {
        return { success: 1, message: 'common.transaction.downtime.logged' };
      }

      // For any unhandled events, return success to prevent Razorpay from retrying
      return { success: 1, message: 'common.transaction.event.logged' };
    } catch (error) {
      this.logger.error(
        `[WEBHOOK] Unexpected error in VerifyPaymentViaWebhook: ${
          (error as Error)?.message ?? 'unknown error'
        }`,
      );
      return { success: 0, message: 'Internal server error' };
    }
  }

  async VerifyPayment(
    verifyPaymentDto: VerifyPaymentDto,
  ): Promise<HttpResponse<Transaction>> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      verifyPaymentDto;

    const transaction = await this.TransactionRepository.findOne({
      where: { razorpay_order_id },
    });
    const user = await this.userService.getUserbyid(
      transaction?.user_id?.toString() || '',
    );
    console.log('Verifying payment for transaction:', transaction);
    console.log('With details:', user);
    if (!transaction) {
      return {
        success: 0,
        message: 'common.transaction.not_found',
      };
    }

    if (transaction.status === 'completed') {
      return {
        success: 1,
        message: 'common.transaction.already_verified',
        data: transaction,
      };
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.razorpayConfig.api_key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return {
        success: 0,
        message: 'common.transaction.signature_invalid',
      };
    }

    try {
      const razorpayPayment =
        await this.razorpay.payments.fetch(razorpay_payment_id);

      if (razorpayPayment.status === 'authorized') {
        await this.razorpay.payments.capture(
          razorpay_payment_id,
          razorpayPayment.amount,
        );
      }

      const previousStatus = transaction.status;
      transaction.status = 'completed';
      transaction.razorpay_payment_id = razorpay_payment_id;
      transaction.amount = Math.round(razorpayPayment.amount / 100);
      await this.TransactionRepository.save(transaction);

      const savedRequest = await this.userService.getReqById(
        transaction.request_id,
      );
      if (!savedRequest) {
        return { success: 0, message: 'common.request.not_found' };
      }

      const mail = config.get<{ [key: string]: string }>('email').admin_email;
      await this.mailService.requestCreated({
        email: mail ,
        applicant_name: user?.full_name ?? '',
        specialty: savedRequest.specialty ?? '',
        urgency: savedRequest.urgency ?? '',
      });
      await this.notifyPaymentSuccess(transaction, previousStatus);
      return {
        success: 1,
        message: 'common.transaction.verified',
        data: transaction,
      };
    } catch (error) {
      console.error('Error verifying Razorpay payment:', error);
      return {
        success: 0,
        message: 'common.transaction.verification_failed',
      };
    }
  }

  private async notifyPaymentSuccess(
    transaction: any,
    previousStatus: TransactionStatus,
  ) {
    if (transaction.status !== 'completed' || previousStatus === 'completed') {
      this.logger.debug(
        `Skipping payment success email for transaction ${transaction.id} (status: ${previousStatus} -> ${transaction.status})`,
      );
      return;
    }

    console.log('Notifying payment success for transaction:', transaction);
    console.log('Previous status:', previousStatus);
    const user = await this.userService.getUserbyid(transaction.company_id);

    if (!user?.email) {
      this.logger.warn(
        `Payment success email skipped: company email missing for transaction ${transaction.id}`,
      );
      return;
    }

    try {
      this.logger.log(
        `Sending payment success email. Company: ${user.email}, amount: ${transaction.amount}, order: ${
          transaction.razorpay_order_id ?? ''
        }`,
      );

      await this.mailService.sendPaymentSuccessEmail({
        to: user.email,
        name: user.full_name || 'User',
        amount: transaction.amount,
        orderId: transaction.razorpay_order_id ?? '',
        paymentId: transaction.razorpay_payment_id ?? '',
        paidAt: transaction.updated_at,
      });

      await this.mailService.sendPaymentSuccessNotificationToAdmins({
        transactionId: transaction.id,
        amount: transaction.amount,
        orderId: transaction.razorpay_order_id ?? '',
        paymentId: transaction.razorpay_payment_id ?? '',
        paidAt: transaction.updated_at,
        email: config.get<{ [key: string]: string }>('email').admin_email,
        user: {
          name: user.full_name ?? 'User',
          email: user.email,
          phone: user.phone ?? '',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment success email for ${user.email}`,
        (error as Error)?.stack,
      );
    }
  }
}
