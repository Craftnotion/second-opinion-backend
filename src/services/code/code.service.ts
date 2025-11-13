import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { VerificationToken, user_identity_type } from 'src/types/types';

import { Code } from 'src/database/entities/code.entity';
import { StringService } from '../string/string.service';

@Injectable()
export class CodeService {
  constructor(
    private readonly stringService: StringService,
    @InjectRepository(Code) private readonly codeRepository: Repository<Code>,
  ) {}

  async findOne(query: FindOptionsWhere<Code>): Promise<Code | null> {
    return await this.codeRepository.findOneBy(query);
  }

  /**
   * @param {string} user_identity The user identity to generate the OTP for
   * @returns {string} The generated OTP
   */
  public async generateOTP(
    user_identity: string,
    user_identity_type: user_identity_type,
  ): Promise<string> {
    const fakePhone = [
      '9191919191',
      '8181818181',
      '9999999991',
      '9999999992',
      '9999999993',
      '9999999994',
      '9999999995',
      '9999999996',
      '9999999997',
      '9999999998',
      '9999999990',
      '9999999910',
      '9999999911',
      '9999999912',
      '9999999913',
      '9999999914',
      '9999999915',
      '9999999916',
      '9999999917',
      '9999999918',
      '9999999919',
      '9999999920',
    ];

    let codeModel =
      (await this.codeRepository.findOne({
        where: {
          user_identity: user_identity,
          user_identity_type: user_identity_type,
        },
      })) || new Code();

    let code = fakePhone.includes(user_identity)
      ? '123456'
      : this.stringService.getString(6, true);
    codeModel.code = code;
    codeModel.user_identity = user_identity;
    codeModel.user_identity_type = user_identity_type;

    //Code should expire in 20 minutes
    codeModel.expire_at = new Date(new Date().getTime() + 20 * 60000);

    await this.codeRepository.save(codeModel);

    return code;
  }

  /**
   * @param {string} user_identity The user identity to verify the OTP for
   * @param {string} code The OTP to verify
   * @param {boolean} remove_when_verified flag to remove the OTP after it has been verified
   * @returns {boolean} True if the OTP is valid, false otherwise
   */
  public async verifyOTP(
    user_identity: string,
    code: string,
    user_identity_type: user_identity_type,
    remove_when_verified: boolean = false,
  ): Promise<boolean> {
    let codeModel = await this.codeRepository.findOne({
      where: { user_identity_type, user_identity, code },
    });

    if (!codeModel) return false;

    if (codeModel.expire_at < new Date()) return false;

    if (remove_when_verified) await this.codeRepository.delete(codeModel);

    return true;
  }

  async generateVerificationData(
    identity: string,
    identity_type: user_identity_type,
  ): Promise<VerificationToken> {
    const expiresIn = 10; // Adjust expiration in hours
    const token = crypto.randomBytes(32).toString('hex');

    const verificationToken = new Code();
    verificationToken.user_identity = identity;
    verificationToken.code = token;
    verificationToken.user_identity_type = identity_type;
    verificationToken.expire_at = new Date(
      new Date().getTime() + expiresIn * 3600 * 1000,
    );

    await this.codeRepository.save(verificationToken);

    return {
      user_identity: identity,
      token,
      user_identity_type: identity_type,
      expiresAt: verificationToken.expire_at,
    };
  }

  async delete(code: Code): Promise<boolean> {
    await this.codeRepository.delete({ id: code.id });
    return true;
  }
}
