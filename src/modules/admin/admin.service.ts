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
import { MailService } from 'src/services/email/email.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
const dbConfig = config.get<{ [key: string]: string }>('app');

@Injectable()
export class AdminService {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(Opinion)
    private readonly opinionRepository: Repository<Opinion>,
    @InjectRepository(opinionDocument)
    private readonly opinionDocumentRepository: Repository<opinionDocument>,
    private readonly mailService: MailService,
    @InjectQueue('text') private readonly textQueue: Queue,
  ) {}

  async getRequests(paramsFilter: filterDto, req: LoginRequest) {
    return await this.userService.getRequests(paramsFilter, req);
  }

  async opinion(
    data: OpinionDto,
    avatar: {
      audioFile?: Express.Multer.File[];
      documents?: Express.Multer.File[];
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
        message: 'common.opinion.already_submitted',
      };
    }

    const opinion = new Opinion();
    opinion.specialist_name = specialistName;
    opinion.qualification = qualification;
    opinion.hospital = hospital;
    opinion.summary = summary;
    if (avatar?.audioFile?.length) {
      opinion.avatar = avatar?.audioFile[0] || null;
    }
    opinion.request_id = request.id;
    await this.opinionRepository.save(opinion);
    if (avatar?.documents?.length) {
      for (const file of avatar.documents) {
        const document = new opinionDocument();
        document.opinion_id = opinion.id;
        document.avatar = file;
        document.metadata = {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };
        await this.opinionDocumentRepository.save(document);
      }
    }
    await this.userService.updateRequestStatus(request.slug);
    // await this.mailService.opinionCreated({
    //   email: request.user.email ?? '',
    //   user_name: request.user.full_name ?? 'User',
    //   request: request.request ?? '',
    //   url: `${dbConfig.frontend_url}/user/requests/${request.slug}`,
    // });

    await this.textQueue.add('response-created', {
      phone: request.user.phone,
      req_id: request.uid,
      req_url: `${dbConfig.frontend_url}/user/requests/${request.slug}`,
    });

    return { success: 1, message: 'common.opinion.submitted' };
  }

  async getRequestById(id: string, req: LoginRequest) {
    return await this.userService.getRequestDetails(id, req);
  }

  async linkGenerator(slug: string) {
    return await this.userService.generateLinks(slug);
  }

  async getRequestByIdTemp(requestSlug: string, userId: string) {
    return await this.userService.getRequestDetailsTemp(requestSlug, userId);
  }
}
