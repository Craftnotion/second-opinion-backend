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


  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar' })
  full_name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Column()
  status: status ;

  @Column({ type: 'varchar', nullable: true })
  public avatar?: string | Express.Multer.File | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}