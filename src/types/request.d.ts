import type { User } from '@/database/entities/project.entity';
import { Request } from 'express';
import { UserData } from './user';
interface LoginRequest extends Request {
    user: User
}

interface UserEntity extends User { }


interface AuthRequest extends Request {
    user: UserData
}