import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { LoginRequest } from 'src/types/request';
import { requestDto } from './dto/request.dto';
import { Requests } from 'src/database/entities/request.entity';
import { Document } from 'src/database/entities/document.entity';
import { filterDto } from '../utils/param-filter.dto';
import { paginate } from 'nestjs-typeorm-paginate';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Requests)
    private readonly requestsRepository: Repository<Requests>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly authService: AuthService,
  ) {}

  async update(req: LoginRequest, requestDto: requestDto) {
    return await this.authService.update(req, requestDto);
  }

  async requests(
    req: LoginRequest,
    requestDto: requestDto,
    avatar: {
      audioFile: Express.Multer.File[];
      documents: Express.Multer.File[];
    },
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
    requests.avatar = avatar.audioFile[0];
    await this.requestsRepository.save(requests);

    for (const file of avatar.documents) {
      const document = new Document();
      document.request_id = requests.id;
      document.avatar = file;
      await this.documentRepository.save(document);
    }

    return { success: 1, message: 'Request created successfully' };
  }

  async getRequests(paramsFilter: filterDto, req: LoginRequest) {
    console.log('paramsFilter', paramsFilter);
    const data = this.requestsRepository
      .createQueryBuilder('requests')
      .where('requests.user_id = :user_id', { user_id: req.user.id });

    if (paramsFilter.search) {
      data.where(
        'requests.specialty ILIKE :search OR requests.urgency ILIKE :search OR requests.request ILIKE :search',
        { search: `%${paramsFilter.search}%` },
      );
    }
    if (paramsFilter.status) {
      data.andWhere('requests.status := status', {
        status: paramsFilter.status,
      });
    }
    const requests = await paginate(data, {
      page: paramsFilter.page ? Number(paramsFilter.page) : 1,
      limit: paramsFilter.limit ? Number(paramsFilter.limit) : 10,
    });
    return {
      success: 1,
      message: 'common.requests.fetched',
      data: requests,
    };
  }

  
}
