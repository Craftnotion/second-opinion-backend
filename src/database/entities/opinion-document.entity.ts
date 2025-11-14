import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Requests } from './request.entity';
import { Opinion } from './opinion.entity';

@Entity('opinion-document')
export class opinionDocument {
  // Internal avatar helpers
  private $avatar_path: string = 'uploads/avatars/users';
  private $avatar_url: string | null = null;
  private $avatar_default: string = 'uploads/avatars/users';
  private $private_file: boolean = true;

  set avatar_url(value: string | null) {
    console.log('setting avatar url to', value);
    this.$avatar_url = value;
  }

  get avatar_url() {
    return this.$avatar_url;
  }

  get avatar_path() {
    return this.$avatar_path;
  }

  get avatar_default() {
    return this.$avatar_default;
  }

  get PRIVATE_FILE() {
    return this.$private_file;
  }

  set PRIVATE_FILE(value: boolean) {
    this.$private_file = value;
  }

  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  opinion_id: number;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | Express.Multer.File | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'json' })
  metadata: Record<string, any> | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Opinion, (Opinion) => Opinion.opinionDocuments)
  @JoinColumn({ name: 'opinion_id' })
  Opinion: Opinion;
}
