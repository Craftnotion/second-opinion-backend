import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from '../user/user.service';
import { HashService } from '../../services/hash/hash.service';
import * as config from 'config';
const dbConfig = config.get<{ [key: string]: string }>('app');

@Injectable()
export class AdminService {
   constructor(
    private readonly userService:UserService,
    private readonly hashService: HashService

   ){}
  

  async createUser(body: CreateUserDto, file?: Express.Multer.File){
    const { full_name, email, phone} = body;
     const existingUser = await this.userService.findOne({
      where: { email: body.email },
    });

      if(existingUser){
         return {
          success: 0,
          message: 'Employee with this email already exists',
        };
      }

    const url = dbConfig.getUrl;
    const newUser = await this.userService.create({
      full_name: full_name,
      email: email,
      phone: phone,
      role: 'employee',
      status: 'inactive',
      password: await this.hashService.hashPassword('defaultPassword123'),
      avatar: file ? url + '/' + file : undefined,
    });
   console.log('newUser', newUser);
   // await this.authService.employeeInvite(newUser);

    return {
      success: 1,
      message: 'common.employee.created',
      data: newUser,
    };
  }
  
}
