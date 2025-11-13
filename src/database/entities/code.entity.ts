import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { user_identity_type } from 'src/types/types';

@Entity()
export class Code {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_identity: string;

  @Column()
  user_identity_type: user_identity_type;

  @Column()
  code: string;

  @Column({ type: 'timestamp' })
  expire_at: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updated_at: Date;
}
