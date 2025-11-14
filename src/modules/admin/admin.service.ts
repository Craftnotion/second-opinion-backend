import { Injectable } from '@nestjs/common';
import { OpinionDto } from './dto/opinion.dto';
import { UserService } from '../user/user.service';
import { HashService } from '../../services/hash/hash.service';
import * as config from 'config';
import { filterDto } from '../utils/param-filter.dto';
import { LoginRequest } from 'src/types/request';
import { Opinion } from 'src/database/entities/opinion.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { opinionDocument } from 'src/database/entities/opinion-document.entity';
const dbConfig = config.get<{ [key: string]: string }>('app');

@Injectable()
export class AdminService {
  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
    @InjectRepository(Opinion)
    private readonly opinionRepository: Repository<Opinion>,
    @InjectRepository(opinionDocument)
    private readonly opinionDocumentRepository: Repository<opinionDocument>,
  ) {}

  async getRequests(paramsFilter: filterDto, req: LoginRequest) {
    return await this.userService.getRequests(paramsFilter, req);
  }

  async opinion(
    data: OpinionDto,
    avatar: {
      audioFile: Express.Multer.File[];
      documents: Express.Multer.File[];
    },
  ) {
    const { specialistName, qualification, hospital, summary, requestId } =
      data;
    const request = await this.userService.getRequestById(requestId);
    if (!request) {
      return { success: 0, message: 'Request not found' };
    } else if (request.status === 'completed') {
      return {
        success: 0,
        message: 'Opinion already submitted for this request',
      };
    }

    const opinion = new Opinion();
    opinion.specialist_name = specialistName;
    opinion.qualification = qualification;
    opinion.hospital = hospital;
    opinion.summary = summary;
    opinion.avatar = avatar.audioFile[0];
    opinion.request_id = request.id;
    await this.opinionRepository.save(opinion);

    for (const file of avatar.documents) {
      const document = new opinionDocument();
      document.opinion_id = opinion.id;
      document.avatar = file;
      await this.opinionDocumentRepository.save(document);
    }
    await this.userService.updateRequestStatus(request.slug);
    return { success: 1, message: 'Opinion created successfully' };
  }

  async getRequestById(id: string, req: LoginRequest) {
    return await this.userService.getRequestDetails(id, req);
  }
}
