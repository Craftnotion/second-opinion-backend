// src/common/utils/unique-id.generator.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UniqueIdGenerator {
  generateRequestId(category: string, requestId: number): string {
    // Get first letter of category, default to 'X' if empty
    const categoryLetter = (category?.[0] || 'X').toUpperCase();
    // Pad request id to 3 digits (e.g., 1 -> 001, 42 -> 042)
    const paddedId = requestId.toString().padStart(3, '0');
    // Format: REQ-C001 (C = category first letter, 001 = padded id)
    return `REQ-${categoryLetter}${paddedId}`;
  }
}
