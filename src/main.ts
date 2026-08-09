import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { validateEnv } from './config/env';

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  const config = new DocumentBuilder()
    .setTitle('Coding Dimension API')
    .setDescription('Backend API for Coding Dimension platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(env.PORT);

  logger.log(`Application running on: http://localhost:${env.PORT}`);
  logger.log(`API docs: http://localhost:${env.PORT}/api/docs`);
  logger.log(`Environment: ${env.NODE_ENV}`);
}

bootstrap();
