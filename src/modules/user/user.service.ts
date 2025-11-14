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
import { UniqueIdGenerator } from 'src/services/uid-generator/uid-generator.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailService } from 'src/services/email/email.service';

@Injectable()
export class UserService {
  constructor(
    private readonly mailService: MailService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Requests)
    private readonly requestsRepository: Repository<Requests>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly authService: AuthService,
    private readonly uidGenerator: UniqueIdGenerator,
  ) {}

  async update(req: LoginRequest, requestDto: requestDto) {
    return await this.authService.update(req, requestDto);
  }

  async requests(
    req: LoginRequest,
    requestDto: requestDto,
    avatar: {
      audioFile?: Express.Multer.File[];
      documents?: Express.Multer.File[];
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
    if (avatar.audioFile) {
      requests.avatar = avatar.audioFile[0];
    }
    requests.uid = this.uidGenerator.generateRequestId();
    await this.requestsRepository.save(requests);

    if (avatar.documents) {
      for (const file of avatar.documents) {
        const document = new Document();
        document.request_id = requests.id;
        document.avatar = file;
        document.metadata = {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };
        await this.documentRepository.save(document);
      }
    }

    const savedRequest = await this.requestsRepository.findOne({
      where: { id: requests.id },
    });
    if (!savedRequest) {
      return { success: 0, message: 'Failed to create request' };
    }

    await this.mailService.requestCreated({
      email: 'craftnotion@gmail.com',
      applicant_name: user.full_name ?? '',
      specialty: savedRequest.specialty ?? '',
      urgency: savedRequest.urgency ?? '',
    });
    return { success: 1, message: 'Request created successfully' };
  }

  async getRequests(paramsFilter: filterDto, req: LoginRequest) {
    let data;
    if (req.user.role === 'admin') {
      data = this.requestsRepository
        .createQueryBuilder('requests')
        .leftJoinAndSelect('requests.opinion', 'opinion.specialist_name')
        .leftJoinAndSelect('requests.user', 'user');
      // .leftJoin('requests.transactions', 'transactions')
      // .where('transactions.status = :status', { status: 'completed' });
    } else {
      data = this.requestsRepository
        .createQueryBuilder('requests')
        .where('requests.user_id = :user_id', { user_id: req.user.id })
        .leftJoinAndSelect('requests.opinion', 'opinion.specialist_name');
    }
    if (paramsFilter.search) {
      data.where(
        'requests.specialty LIKE :search OR requests.urgency LIKE :search OR requests.request LIKE :search',
        { search: `%${paramsFilter.search}%` },
      );
    }
    if (paramsFilter.status) {
      data.andWhere('requests.status = :status', {
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

  async getRequestById(id: string) {
    return await this.requestsRepository.findOne({
      where: { slug: id },
      relations: ['user'],
    });
  }

  async updateRequestStatus(id: string) {
    const request = await this.requestsRepository.findOne({
      where: { slug: id },
    });
    if (!request) {
      return { success: 0, message: 'Request not found' };
    }
    request.status = 'completed';
    await this.requestsRepository.save(request);
    return { success: 1, message: 'Request status updated successfully' };
  }

  async getRequestDetails(id: string, req: LoginRequest) {
    let relations = ['documents', 'opinion', 'opinion.opinionDocuments'];
    if (req.user.role === 'admin') {
      relations = ['documents', 'opinion', 'opinion.opinionDocuments', 'user'];
    }
    const request = await this.requestsRepository.findOne({
      where: { slug: id },
      relations: relations,
    });
    if (!request) {
      return { success: 0, message: 'Request not found' };
    }
    return { success: 1, message: 'Request details fetched', data: request };
  }

  async getUserbyid(id: string) {
    return await this.userRepository.findOne({ where: { slug: id } });
  }
}
