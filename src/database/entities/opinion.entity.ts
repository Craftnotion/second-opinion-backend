import { Multer } from 'multer';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Requests } from './request.entity';
import { opinionDocument } from './opinion-document.entity';

@Entity('opinion')
export class Opinion {
  // Internal avatar helpers
  private $avatar_path: string = 'uploads/avatars/users';
  private $avatar_url: string | null = null;
  private $avatar_default: string = 'uploads/avatars/users';
  private $private_file: boolean = true;

  set avatar_url(value: string | null) {
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

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  request_id: number;

  @Column({ type: 'varchar', nullable: true })
  specialist_name: string;

  @Column({ type: 'varchar', nullable: true })
  qualification: string;

  @Column({ type: 'varchar', nullable: true })
  hospital: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | Express.Multer.File | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToOne(() => Requests, (request) => request.opinion)
  @JoinColumn({ name: 'request_id' })
  request: Requests;

  @OneToMany(
    () => opinionDocument,
    (opinionDocument) => opinionDocument.Opinion,
  )
  opinionDocuments: opinionDocument[];
}
