import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as config from 'config';
import { promises as fsPromises } from 'fs';
@Injectable()
export class FileService {
  async saveFile(file: any, folder: string) {
    const disk = 'local';

    if (!file?.originalname) return null;

    const ext = extname(file.originalname).replace('.', '');
    const newName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;

    if (disk === 'local') {
      const absoluteFolderPath = join(process.cwd(), folder);

      if (!fs.existsSync(absoluteFolderPath)) {
        fs.mkdirSync(absoluteFolderPath, { recursive: true });
      }

      const filePath = join(absoluteFolderPath, newName);
      fs.writeFileSync(filePath, file.buffer);
    }

    return `${folder}/${newName}`;
  }

  // async generateSignedUrl(file: string) {
  //     const params = {
  //         Bucket: awsCONFIG.bucket_name || "" || "",
  //         Key: file,
  //         // Expires: 60, // Set expiration time
  //     };

  //     try {
  //         const url = await this.s3.getSignedUrl('getObject', params);
  //         return url;
  //     } catch (error) {
  //         console.error(`Error generating signed URL: ${error}`);
  //         return null;
  //     }
  // }

  async saveFiles(files: any[], folder: string) {
    for (const file of files) {
      await this.saveFile(file, folder);
    }
  }

  async destroyFile(filePath: string) {
    if (
      filePath === 'uploads/avatars/users/expert-default.png' ||
      filePath === 'uploads/avatars/users/sme-default.png'
    ) {
      return;
    }

    const disk = config.get<{ [key: string]: string }>('storage').disk;

    if (disk === 'local') {
      const absolutePath = join(process.cwd(), filePath);

      try {
        await fsPromises.unlink(absolutePath);
      } catch (err) {}
    }
    // } else if (disk === 's3') {
    //     // Implement logic to remove a file from S3
    //     const params = {
    //         Bucket: awsCONFIG.bucket_name || "",
    //         Key: filePath,
    //     };

    //     this.s3.deleteObject(params, function (err) {
    //         if (err) console.log(err, err.stack);
    //         else console.log(`File ${filePath} deleted successfully`);
    //     });
    // }
  }
}
