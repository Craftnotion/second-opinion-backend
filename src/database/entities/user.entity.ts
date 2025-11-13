import { status } from 'src/types/types';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar' })
  full_name: string | null;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
