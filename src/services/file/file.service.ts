import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as config from 'config';
import { awsConfig, saveFileOptions } from 'src/types/types';

const awsCONFIG = config.get<awsConfig>('aws');

@Injectable()
export class FileService {
    private s3;

    constructor() {

        this.s3 = new AWS.S3({
            signatureVersion: "v4",
            ...awsCONFIG
        });
    }

    async saveFile(file: any, folder: string, options?: saveFileOptions) {
        const disk = config.get<{ [key: string]: string }>('storage').disk

        const ext = extname(file.originalname).replace('.', '');

        let { isPrivate = false } = options || {};

        //Change the name of file to some alpha numeric random string avoid conflicts
        const newName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;

        if (disk === 'local') {

            if(!fs.existsSync(folder)) fs.mkdirSync(folder);

            const filePath = join(folder, newName);
            fs.writeFileSync(filePath, file.buffer);
        } else if (disk === 's3') {
            const params = {
                Bucket: awsCONFIG.bucket_name || "",
                Key: `${folder}/${newName}`,
                ContentType: file.mimetype,
                Body: file.buffer,
                ...(isPrivate ? { ACL: 'private' } : {})
            } as AWS.S3.PutObjectRequest;
            await this.s3.upload(params).promise();
        }

        return `${folder}/${newName}`;
    }

    async generateSignedUrl(file: string) {
        const params = {
            Bucket: config.get<string>('AWS_BUCKET_NAME') || "",
            Key: file,
            Expires: 60, // Set expiration time
        };

        try {
            const url = await this.s3.getSignedUrl('getObject', params);
            return url;
        } catch (error) {
            console.error(`Error generating signed URL: ${error}`);
            return null;
        }
    }


    async saveFiles(files: any[], folder: string) {
        for (const file of files) {
            await this.saveFile(file, folder);
        }
    }

    async destroyFile(filePath: string) {
        const disk = config.get<{ [key: string]: string }>('storage').disk;
        if (disk === 'local') {
            // Implement logic to remove a file from local disk
            fs.unlink(filePath, (err) => {
                if (err) throw err;
            });
        } else if (disk === 's3') {
            // Implement logic to remove a file from S3
            const params = {
                Bucket: awsCONFIG.bucket_name || "",
                Key: filePath,
            };

            this.s3.deleteObject(params, function (err) {
                if (err) console.log(err, err.stack);
                else console.log(`File ${filePath} deleted successfully`);
            });
        }
    }
}