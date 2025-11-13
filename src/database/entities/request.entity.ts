import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('requests')
export class Requests {
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

  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', nullable: true })
  specialty: string | null;

  @Column({ type: 'text', nullable: true })
  request: string | null;

  @Column({ type: 'varchar', nullable: true })
  urgency: string | null;

  @Column({ type: 'decimal', nullable: true })
  cost: number | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | Express.Multer.File | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
