// src/common/utils/unique-id.generator.ts
import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';

@Injectable()
export class UniqueIdGenerator {
  generateRequestId(): string {
    const nums = '0123456789';
    const id = Array.from({ length: 3 }, () =>
      nums.charAt(Math.floor(Math.random() * nums.length)),
    ).join('');
    // Format: EMP-XXX
    return `REQ-${id.slice(0, 3)}`;
  }
}
