import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';
import { TransactionStatus } from 'src/types/types';
import { Requests } from './request.entity';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  amount: number;

  @Column({ default: 'pending' })
  status: TransactionStatus;

  @Column({ nullable: true })
  razorpay_order_id: string;

  @Column({ nullable: true })
  request_id: number;

  @Index()
  @Column({ nullable: true })
  razorpay_payment_id: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updated_at: Date;

  //Relations
  @ManyToOne(() => User, (User) => User.id)
  @JoinColumn({ name: 'User_id' })
  @Exclude()
  user: User;

  @OneToOne(() => Requests, (request) => request.transaction)
  @JoinColumn({ name: 'request_id' })
  request: Request;
}

export interface PaymentLink extends Transaction {
  payment_link: string;
}
