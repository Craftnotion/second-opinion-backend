import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
// import { CreateTransactionDto } from './dto/transaction.dto';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as config from 'config';
// import { AuthRequest } from '@/types/request';
import * as crypto from 'crypto';
import { Transaction } from 'src/database/entities/transaction.entity';
import { User } from 'src/database/entities/user.entity';
import { UserService } from '../user/user.service';
import { HttpResponse, TransactionStatus } from 'src/types/types';
import { TransactionDto } from './dto/transaction.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MailService } from 'src/services/email/email.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
const Razorpay = require('razorpay');

@Injectable()
export class TransactionService {
  private razorpay: any;

  private readonly logger = new Logger(TransactionService.name);
  private razorpayConfig = {
    api_key_id: 'rzp_live_RlYwTHQonD7sTO',
    api_key_secret: 'Rn3P14ehYf9zjbv53LbyRv7L',
    webhook_secret: 'NESTJSBACKEND@CTIVE!@#$%AUTHT',
    merchant_id: 'RB53YT2akk4wV2',
  };
  constructor(
    @InjectRepository(Transaction)
    private readonly TransactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly mailService: MailService,
    @InjectQueue('text') private readonly textQueue: Queue,
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

    // Check if this qualifies as a free request
    const pastTransaction = await this.TransactionRepository.findOne({
      where: {
        user_id: user.id,
        status: 'completed',
      },
      order: { created_at: 'DESC' },
    });

    const isFree = !pastTransaction && request.urgency === 'standard';

    // Create transaction
    const transaction = this.TransactionRepository.create({
      user: user,
      amount: isFree ? 0 : Number(amount),
      status: isFree ? 'completed' : 'pending',
      request_id: request.id,
    });
    const savedTransaction = await this.TransactionRepository.save(transaction);

    if (isFree) {
      this.logger.log(
        `[FREE_REQUEST] Created free transaction ${savedTransaction.id} for user ${userId}`,
      );

      // Send SMS notification
      await this.textQueue.add('send-payment-sms', {
        phone: user.phone,
        orderId: request.uid,
      });

      const admin = await this.userRepository.findOne({
        where: { role: 'admin' },
      });
      await this.textQueue.add('send-to-admin-payment-sms', {
        user_name: user?.full_name || 'User',
        reason: request?.request || '',
        req_url:
          config.get<{ [key: string]: string }>('frontend').base_url +
          `/req/${request?.slug}`,
        phone: admin?.phone || '',
      });

      return {
        success: 1,
        message: 'common.transaction.free_request',
        data: {
          transaction_id: savedTransaction.id,
          amount: 0,
          status: 'completed',
          is_free: true,
          request_id: request.id,
        },
      };
    }

    // Handle paid requests - create Razorpay order
    const options = {
      amount: Number(amount) * 100,
      currency: 'INR',
      receipt: `receipt_order_${savedTransaction.id}`,
      notes: {
        user_id: userId,
        transaction_id: savedTransaction.id,
        user_phone: user.phone || '',
        user_name: user.full_name || '',
        user_email: user.email || '',
      },
    };

    const order = await this.razorpay.orders.create(options);

    // Link Razorpay order to transaction
    savedTransaction.razorpay_order_id = order.id;
    await this.TransactionRepository.save(savedTransaction);

    return {
      success: 1,
      message: 'common.transaction.order.created',
      data: {
        id: order.id,
        order_id: order.id,
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
        notes: options.notes,
      },
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

  private async findTransactionForWebhook(
    payment: any,
    order: any,
  ): Promise<Transaction | null> {
    let transactionId =
      payment?.notes?.transaction_id || order?.notes?.transaction_id;

    // 1. Try by Razorpay Order ID
    if (!transactionId && order?.id) {
      const transaction = await this.TransactionRepository.findOne({
        where: { razorpay_order_id: order.id },
      });
      if (transaction) return transaction;
    }

    // 2. Try by Transaction ID from notes
    if (transactionId) {
      const transaction = await this.TransactionRepository.findOne({
        where: { id: parseInt(transactionId) },
      });
      if (transaction) return transaction;
    }

    // 3. Fallback: User + Amount
    this.logger.log(
      '[WEBHOOK] Transaction ID not found in notes/order. Attempting fallback lookup...',
    );

    const userEmail = payment?.email || payment?.notes?.user_email;
    const userContact = payment?.contact || payment?.notes?.user_phone;

    let user = null;
    if (userEmail) {
      user = await this.userRepository.findOne({
        where: { email: userEmail },
      });
    }

    if (!user && userContact) {
      let phone = userContact;
      if (phone.startsWith('+91')) phone = phone.substring(3);
      else if (phone.startsWith('91') && phone.length === 12)
        phone = phone.substring(2);
      user = await this.userRepository.findOne({
        where: { phone: phone },
      });
    }

    if (user) {
      const amountInRupees = (payment?.amount || order?.amount) / 100;
      const pendingTransaction = await this.TransactionRepository.findOne({
        where: {
          user_id: user.id,
          amount: amountInRupees,
          status: 'pending',
        },
        order: { created_at: 'DESC' },
      });
      if (pendingTransaction) {
        this.logger.log(
          `[WEBHOOK] Found pending transaction ${pendingTransaction.id} via fallback lookup`,
        );
        return pendingTransaction;
      }
    }

    return null;
  }

  private async capturePayment(
    paymentId: string,
    amount: number,
    currency: string = 'INR',
  ): Promise<boolean> {
    try {
      // 1. Check current status first
      const payment = await this.razorpay.payments.fetch(paymentId);

      if (payment.status === 'captured') {
        this.logger.log(`[WEBHOOK] Payment ${paymentId} is already captured.`);
        return true;
      }

      if (payment.status !== 'authorized') {
        this.logger.error(
          `[WEBHOOK] Payment ${paymentId} is in ${payment.status} status. Cannot capture.`,
        );
        return false;
      }

      // 2. Attempt capture
      try {
        await this.razorpay.payments.capture(paymentId, amount, currency);
        return true;
      } catch (captureError: any) {
        const errorDescription =
          captureError.error?.description || captureError.message;

        // Handle race conditions
        if (
          errorDescription ===
            'Request failed because another payment operation is in progress' ||
          errorDescription === 'Payment has already been captured'
        ) {
          this.logger.log(
            `[WEBHOOK] Payment ${paymentId} capture race condition: ${errorDescription}. Verifying status...`,
          );

          // Verify status again
          const freshPayment = await this.razorpay.payments.fetch(paymentId);
          return freshPayment.status === 'captured';
        }

        this.logger.error(
          `[WEBHOOK] Failed to capture payment ${paymentId}`,
          captureError,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `[WEBHOOK] Error in capturePayment for ${paymentId}`,
        error,
      );
      return false;
    }
  }

  async VerifyPaymentViaWebhook(Body: any, Header: string) {
    try {
      // Verify Razorpay signature
      const razorpaySignature = Header;
      const body = JSON.stringify(Body);

      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayConfig.webhook_secret)
        .update(body)
        .digest('hex');

      if (razorpaySignature !== expectedSignature) {
        this.logger.error('[WEBHOOK] Signature verification failed');
        return { success: 0, message: 'common.transaction.failed' };
      }

      const { event, payload } = Body;
      this.logger.log(`[WEBHOOK] Received event: ${event}`);

      if (event === 'payment.authorized') {
        const payment = payload.payment.entity;

        // Use helper to capture
        const isCaptured = await this.capturePayment(
          payment.id,
          payment.amount,
          payment.currency,
        );

        if (!isCaptured) {
          return { success: 0, message: 'payment.not.captured' };
        }

        const transaction = await this.findTransactionForWebhook(
          payment,
          payload.order?.entity,
        );

        if (transaction) {
          transaction.status = 'completed';
          transaction.razorpay_payment_id = payment.id;
          if (payment.order_id)
            transaction.razorpay_order_id = payment.order_id;

          await this.TransactionRepository.save(transaction);
          await this.notifyPaymentSuccess(transaction, transaction.status);
          this.logger.log(
            `[WEBHOOK] Transaction ${transaction.id} completed via payment.authorized`,
          );
        } else {
          this.logger.error(
            '[WEBHOOK] Transaction not found for payment.authorized',
            payment.id,
          );
        }

        return { success: 1, message: 'common.transaction.captured' };
      }

      if (event === 'order.paid') {
        const order = payload.order.entity;

        // Get payments for this order
        const payments = await this.razorpay.orders.fetchPayments(order.id);
        const payment = payments.items?.[0]; // Taking the first payment

        if (payment) {
          // Use helper to capture (idempotent)
          const isCaptured = await this.capturePayment(
            payment.id,
            payment.amount,
            payment.currency,
          );

          if (isCaptured) {
            const transaction = await this.findTransactionForWebhook(
              payment,
              order,
            );

            if (transaction) {
              transaction.status = 'completed';
              transaction.razorpay_payment_id = payment.id;
              transaction.razorpay_order_id = order.id;

              await this.TransactionRepository.save(transaction);
              await this.notifyPaymentSuccess(transaction, transaction.status);
              this.logger.log(
                `[WEBHOOK] Transaction ${transaction.id} completed via order.paid`,
              );
            } else {
              this.logger.error(
                '[WEBHOOK] Transaction not found for order.paid',
                order.id,
              );
            }
          } else {
            this.logger.log(
              `[WEBHOOK] Payment ${payment.id} not captured in order.paid event. Skipping.`,
            );
          }
        }
        return { success: 1, message: 'common.transaction.order_paid' };
      }

      if (event === 'payment.failed') {
        const payment = payload.payment.entity;
        const transaction = await this.findTransactionForWebhook(
          payment,
          payload.order?.entity,
        );

        if (transaction) {
          transaction.status = 'failed';
          transaction.razorpay_payment_id = payment.id;
          if (payment.order_id)
            transaction.razorpay_order_id = payment.order_id;
          await this.TransactionRepository.save(transaction);
          this.logger.log(
            `[WEBHOOK] Transaction ${transaction.id} marked failed`,
          );
        }
        return { success: 1, message: 'common.transaction.failed' };
      }

      // Handle payment.captured event (already captured payments)
      if (event === 'payment.captured') {
        const payment = payload.payment.entity;
        const transaction = await this.findTransactionForWebhook(
          payment,
          payload.order?.entity,
        );

        if (transaction) {
          // Check if already processed
          if (transaction.status === 'completed') {
            this.logger.log(
              `[WEBHOOK] Transaction ${transaction.id} already completed`,
            );
            return {
              success: 1,
              message: 'common.transaction.already.completed',
            };
          }

          transaction.status = 'completed';
          transaction.razorpay_payment_id = payment.id;
          if (payment.order_id)
            transaction.razorpay_order_id = payment.order_id;

          await this.TransactionRepository.save(transaction);
          await this.notifyPaymentSuccess(transaction, transaction.status);
          this.logger.log(
            `[WEBHOOK] Transaction ${transaction.id} completed via payment.captured`,
          );
        } else {
          this.logger.error(
            '[WEBHOOK] Transaction not found for payment.captured',
            payment.id,
          );
        }
        return { success: 1, message: 'common.transaction.captured' };
      }

      // Handle dispute events
      if (
        event === 'payment.dispute.created' ||
        event === 'payment.dispute.under_review' ||
        event === 'payment.dispute.action_required'
      ) {
        const order = payload.order?.entity;
        if (order) {
          const transaction = await this.TransactionRepository.findOne({
            where: { razorpay_order_id: order.id },
          });

          if (transaction && transaction.status !== 'completed') {
            transaction.status = 'failed';
            await this.TransactionRepository.save(transaction);
          }
        }
        return { success: 1, message: 'common.transaction.dispute.created' };
      }

      // Handle dispute resolved events
      if (
        event === 'payment.dispute.won' ||
        event === 'payment.dispute.lost' ||
        event === 'payment.dispute.closed'
      ) {
        const order = payload.order?.entity;
        if (order) {
          const transaction = await this.TransactionRepository.findOne({
            where: { razorpay_order_id: order.id },
          });

          if (transaction) {
            if (event === 'payment.dispute.won') {
              const previousStatus = transaction.status;
              transaction.status = 'completed';
              await this.TransactionRepository.save(transaction);
              await this.notifyPaymentSuccess(transaction, previousStatus);
            } else {
              transaction.status = 'failed';
              await this.TransactionRepository.save(transaction);
            }
          }
        }
        return { success: 1, message: 'common.transaction.dispute.resolved' };
      }

      // Handle order notification events
      if (
        event === 'order.notification.delivered' ||
        event === 'order.notification.failed'
      ) {
        return {
          success: 1,
          message: 'common.transaction.notification.logged',
        };
      }

      // Handle downtime events
      if (
        event === 'payment.downtime.started' ||
        event === 'payment.downtime.updated' ||
        event === 'payment.downtime.resolved'
      ) {
        return { success: 1, message: 'common.transaction.downtime.logged' };
      }

      return { success: 1, message: 'ignored' };
    } catch (err) {
      this.logger.error('[WEBHOOK] Error processing webhook', err);
      return { success: 0, message: 'common.transaction.failed' };
    }
  }

  async VerifyPayment(
    verifyPaymentDto: VerifyPaymentDto,
  ): Promise<HttpResponse<Transaction>> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      verifyPaymentDto;

    // CRITICAL: Check if this payment ID was already processed to prevent duplicates
    const existingTransaction = await this.TransactionRepository.findOne({
      where: { razorpay_payment_id: razorpay_payment_id },
    });

    if (existingTransaction) {
      this.logger.log(
        `[VERIFY_PAYMENT] Payment ${razorpay_payment_id} already processed for transaction ${existingTransaction.id}`,
      );
      return {
        success: 1,
        message: 'common.transaction.already_verified',
        data: existingTransaction,
      };
    }

    const transaction = await this.TransactionRepository.findOne({
      where: { razorpay_order_id },
    });
    const user = await this.userService.getUserbyid(
      transaction?.user_id?.toString() || '',
    );
    this.logger.log('Verifying payment for transaction:', transaction?.id);
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
      this.logger.warn(
        `[VERIFY_PAYMENT] Invalid signature for order ${razorpay_order_id}`,
      );
      return {
        success: 0,
        message: 'common.transaction.signature_invalid',
      };
    }

    try {
      const razorpayPayment =
        await this.razorpay.payments.fetch(razorpay_payment_id);

      // Use the capture helper for idempotent capture
      if (razorpayPayment.status === 'authorized') {
        const isCaptured = await this.capturePayment(
          razorpay_payment_id,
          razorpayPayment.amount,
          razorpayPayment.currency,
        );
        if (!isCaptured) {
          transaction.status = 'failed';
          await this.TransactionRepository.save(transaction);
          return {
            success: 0,
            message: 'common.transaction.capture_failed',
          };
        }
      } else if (razorpayPayment.status !== 'captured') {
        transaction.status = 'failed';
        await this.TransactionRepository.save(transaction);
        return {
          success: 0,
          message: 'common.transaction.verification_failed',
        };
      }

      const previousStatus = transaction.status;
      transaction.status = 'completed';
      transaction.razorpay_payment_id = razorpay_payment_id;
      transaction.razorpay_order_id = razorpay_order_id; // Ensure order_id is set
      transaction.amount = Math.round(razorpayPayment.amount / 100);
      await this.TransactionRepository.save(transaction);

      const savedRequest = await this.userService.getReqById(
        transaction.request_id,
      );
      if (!savedRequest) {
        return { success: 0, message: 'common.request.not_found' };
      }

      await this.notifyPaymentSuccess(transaction, previousStatus);
      this.logger.log(
        `[VERIFY_PAYMENT] Transaction ${transaction.id} verified successfully`,
      );
      return {
        success: 1,
        message: 'common.transaction.verified',
        data: transaction,
      };
    } catch (error) {
      this.logger.error(
        `[VERIFY_PAYMENT] Error verifying Razorpay payment: ${razorpay_payment_id}`,
        error,
      );
      transaction.status = 'failed';
      await this.TransactionRepository.save(transaction);
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
    // NOTE: transaction entity has `user_id`, not `company_id`.
    // Using `company_id` was returning undefined which led to an incorrect user lookup
    // and mails being delivered to an unintended recipient (e.g. id 0). Use `user_id`.
    let user = await this.userService.getUserbyid(
      transaction.user_id?.toString() || '',
    );

    const request = await this.userService.requestsRepository
      .createQueryBuilder('requests')
      .leftJoinAndSelect('requests.user', 'user')
      .where('requests.id = :id', { id: transaction.request_id })
      .getOne();
    // if (!user?.email) {
    //   this.logger.warn(
    //     `Payment success email skipped: user email missing for transaction ${transaction.id} (user_id: ${transaction.user_id})`,
    //   );
    //   return;
    // }

    try {
      // this.logger.log(
      //   `Sending payment success email. Company: ${user.email}, amount: ${transaction.amount}, order: ${
      //     transaction.razorpay_order_id ?? ''
      //   }`,
      // );

      // await this.mailService.sendPaymentSuccessEmail({
      //   to: user.email,
      //   name: user.full_name || 'User',
      //   amount: transaction.amount,
      //   orderId: transaction.razorpay_order_id ?? '',
      //   paymentId: transaction.razorpay_payment_id ?? '',
      //   paidAt: transaction.updated_at,
      // });

      await this.textQueue.add('send-payment-sms', {
        phone: user?.phone,
        amount: transaction.amount,
        orderId: request?.uid ?? '',
        paymentId: transaction.razorpay_payment_id ?? '',
      });

      const admin = await this.userService.userRepository.findOne({
        where: {
          role: 'admin',
        },
      });

      await this.textQueue.add('send-to-admin-payment-sms', {
        user_name: user?.full_name || 'User',
        reason: request?.request || '',
        req_url:config.get<{ [key: string]: string }>('frontend').base_url +
          `/admin/dashboard/${request?.slug}`,
        phone: admin?.phone || '',
      });

      await this.mailService.sendPaymentSuccessNotificationToAdmins({
        transactionId: transaction.id,
        amount: transaction.amount,
        orderId: transaction.razorpay_order_id ?? '',
        paymentId: transaction.razorpay_payment_id ?? '',
        paidAt: transaction.updated_at,
        email: config.get<{ [key: string]: string }>('email').admin_email,
        request: request?.request || '',
        urgency: request?.urgency || '',
        specialty: request?.specialty || '',
        user: {
          name: user?.full_name ?? 'User',
          email: user?.email ?? '',
          phone: user?.phone ?? '',
        },
        url:
          config.get<{ [key: string]: string }>('frontend').base_url +
          `/admin/dashboard`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment success email for ${user?.email}`,
        (error as Error)?.stack,
      );
    }
  }
}
