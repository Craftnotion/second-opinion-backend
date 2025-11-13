import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { LoginRequest } from 'src/types/request';
import { requestDto } from './dto/request.dto';
import { Requests } from 'src/database/entities/request.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Requests)
    private readonly requestsRepository: Repository<Requests>,
    private readonly authService: AuthService,
  ) {}

  async update(req: LoginRequest, requestDto: requestDto) {
    return await this.authService.update(req, requestDto);
  }

  async requests(
    req: LoginRequest,
    requestDto: requestDto,
    avatar: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: req.user.id },
    });
    if (!user) {
      return { success: 0, message: 'User not found' };
    }

    const { specialty, urgency, request, cost } = requestDto;

    const requests = new Requests();
    requests.user_id = user.id;
    requests.specialty = specialty || null;
    requests.urgency = urgency || null;
    requests.request = request || null;
    requests.cost = cost ? parseFloat(cost) : null;
    if (avatar) {
      requests.avatar = avatar;
    }

    await this.requestsRepository.save(requests);

    return { success: 1, message: 'Request created successfully' };
  }
}
