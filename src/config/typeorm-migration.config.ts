import { join } from 'path';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env' });

// Use process.cwd() as base and resolve relative paths
const getBasePath = () => {
  // In CommonJS, __dirname is available
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // In ES modules, calculate from process.cwd()
  return join(process.cwd(), 'src', 'config');
};

const basePath = getBasePath();

async function getDataSource(): Promise<DataSource> {
  const app = await NestFactory.createApplicationContext(
    ConfigModule.forRoot({
      envFilePath: ['.env.development', '.env.production', '.env'],
      isGlobal: true,
    }),
  );

  const configService = app.get(ConfigService);
  return new DataSource({
    type: configService.get<any>('TYPEORM_CONNECTION'),
    host: configService.get<string>('TYPEORM_HOST'),
    database: configService.get<string>('TYPEORM_DATABASE'),
    username: configService.get<string>('TYPEORM_USERNAME'),
    password: configService.get<string>('TYPEORM_PASSWORD'),
    port: configService.get<number>('TYPEORM_PORT', 3306),
    synchronize: false,
    logging: false,
    entities: [
      join(basePath, '../', 'database', 'entities', '**', '*.entity.{ts,js}'),
    ],
    migrations: [join(basePath, '../', 'database', 'migrations/*.ts')]
  });
}

const dataSource = getDataSource();
export default dataSource;
