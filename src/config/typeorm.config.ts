import { join } from "path";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataSourceOptions } from "typeorm";

export const typeormConfig = (configService: ConfigService): DataSourceOptions => {
  return ({
    type: configService.get<string>('TYPEORM_CONNECTION') as any,
    host: configService.get<string>('TYPEORM_HOST'),
    username: configService.get<string>('TYPEORM_USERNAME'),
    password: configService.get<string>('TYPEORM_PASSWORD'),
    database: configService.get<string>('TYPEORM_DATABASE'),
    port: parseInt(configService.get<string>('TYPEORM_PORT') || "3306"),
    synchronize: false,
    logging: false,
    entities: [join(__dirname, "../", "database", "entities", '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, "../", "database", 'migrations/*.ts')],
    
  })
};

export const typeormAsyncConfig = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: typeormConfig,
};