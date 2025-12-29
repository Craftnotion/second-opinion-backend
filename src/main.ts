import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import * as config from 'config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  if (config.get<string>('node_env') === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Second Opinion apis')
      .setDescription('The Second Opinion API description')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', in: 'header' }, 'authorization')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api', app, document);
  }
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen('3023','192.168.1.41');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
