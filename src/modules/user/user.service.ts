import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { LoginRequest } from 'src/types/request';
import { requestDto } from './dto/request.dto';
import { Requests } from 'src/database/entities/request.entity';
import { Document } from 'src/database/entities/document.entity';
import { filterDto } from '../utils/param-filter.dto';
import { paginate } from 'nestjs-typeorm-paginate';
import { UniqueIdGenerator } from 'src/services/uid-generator/uid-generator.service';
import { MailService } from 'src/services/email/email.service';
import { TransactionService } from '../transaction/transaction.service';
import { Transaction } from 'src/database/entities/transaction.entity';
import * as config from 'config';

@Injectable()
export class UserService {
  constructor(
    private readonly mailService: MailService,

    @InjectRepository(User)
    public readonly userRepository: Repository<User>,
    @InjectRepository(Requests)
    public readonly requestsRepository: Repository<Requests>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly authService: AuthService,
    private readonly uidGenerator: UniqueIdGenerator,
    @Inject(forwardRef(() => TransactionService))
    private readonly transactionService: TransactionService,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) { }

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
      return { success: 0, message: 'common.user.not_found' };
    }

    const { specialty, urgency, request, cost } = requestDto;

    const pastTransaction = await this.transactionRepository.findOne({
      where: { user_id: user.id },
    });

    const isFree = !pastTransaction && urgency === 'standard';
    const requests = new Requests();
    requests.user_id = user.id;
    requests.specialty = specialty || null;
    requests.urgency = urgency || null;
    requests.request = request || null;
    requests.cost = isFree ? 0 : parseInt(cost) || null;
    if (avatar.audioFile) {
      requests.avatar = avatar.audioFile[0] || null;
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
      return { success: 0, message: 'common.request.failed' };
    }

    // Create transaction and Razorpay order
    try {
      const orderData = await this.transactionService.createOrderForRequest(
        user.id.toString(),
        savedRequest.id.toString(),
        savedRequest.cost !== null && savedRequest.cost !== undefined
          ? savedRequest.cost.toString()
          : '0',
      );

      if (orderData.transaction_id) {
        const transaction = await this.transactionRepository.findOne({
          where: { id: orderData.transaction_id },
        });
      }

      return {
        success: 1,
        message: 'common.request.created',
        data: {
          id: savedRequest.id,
          cost: savedRequest.cost,
          specialty: savedRequest.specialty,
          urgency: savedRequest.urgency,
          request: savedRequest,
          order: orderData,
        },
      };
    } catch (error) {
      console.error('Error creating payment order:', error);
      return {
        success: 0,
        message: 'Request created but payment order failed',
      };
    }
  }

  async getRequests(paramsFilter: filterDto, req: LoginRequest) {
    let data;
    if (req.user.role === 'admin') {
      data = this.requestsRepository
        .createQueryBuilder('requests')
        .leftJoinAndSelect('requests.opinion', 'opinion.specialist_name')
        .leftJoinAndSelect('requests.user', 'user')
        .leftJoin('requests.transaction', 'transaction')
        .where('transaction.status = :status', { status: 'completed' });
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
    data.orderBy('requests.id', 'DESC');
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
    // Try to find by numeric ID first, then by uid
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const request = await this.requestsRepository.findOne({
        where: { id: numericId },
        relations: ['user'],
      });
      if (request) {
        return request;
      }
    }
    // Fallback to uid lookup
    return await this.requestsRepository.findOne({
      where: { uid: id },
      relations: ['user'],
    });
  }

  async updateRequestStatus(id: string) {
    const request = await this.requestsRepository.findOne({
      where: { uid: id },
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
      where: { uid: id },
      relations: relations,
    });
    if (!request) {
      return { success: 0, message: 'common.request.not_found' };
    }
    return { success: 1, message: 'common.request.found', data: request };
  }

  async getUserbyid(id: string) {
    // Try to find by numeric ID first, then by slug
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const user = await this.userRepository.findOne({
        where: { id: numericId },
      });
      if (user) {
        return user;
      }
    }
    // Fallback to slug lookup
    return await this.userRepository.findOne({ where: { slug: id } });
  }

  async getReqById(id: number) {
    return await this.requestsRepository.findOne({ where: { id: id } });
  }

  async generateLinks(uid: string) {
    const dbConfig = config.get<{ [key: string]: string }>('frontend');
    const admin = await this.userRepository.findOne({
      where: { role: 'admin' },
    });
    const token = await this.authService.GenerateToken(
      {
        request: {
          requestUid: uid,
          userId: admin?.id || 0,
        },
      },
      '24h',
    );
    const team_url = `${dbConfig.base_url}` + `/report/${token}`;
    return { success: 1, message: 'Link generated', data: team_url };
  }

  async getRequestDetailsTemp(requestUid: string, userId: string) {
    const request = await this.requestsRepository.findOne({
      where: { uid: requestUid },
      relations: ['documents', 'opinion', 'opinion.opinionDocuments', 'user'],
    });
    if (!request) {
      return { success: 0, message: 'common.request.not_found' };
    }
    return { success: 1, message: 'common.request.found', data: request };
  }

  async isFree(user: LoginRequest) {
    const pastTransaction = await this.transactionRepository.findOne({
      where: { user_id: user.user.id, status: 'completed' },
    });
    return {
      success: 1,
      message: 'common.user.free_status',
      data: !pastTransaction,
    };
  }
}
