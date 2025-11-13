import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from '../user/user.service';
import { HashService } from '../../services/hash/hash.service';
import * as config from 'config';
const dbConfig = config.get<{ [key: string]: string }>('app');

@Injectable()
export class AdminService {
  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
  ) {}
}
