import 'dotenv/config';
import './register-aliases';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { validateEnv } from '@/config/env';

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  const logger = new Logger('Bootstrap');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());

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

  const swagger = new DocumentBuilder()
    .setTitle('Coding Dimension API')
    .setDescription(
      'REST API for blogs, notes, auth (httpOnly cookies + OAuth), comments, likes/dislikes, wishlist',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(env.PORT);
  logger.log(`Application running on: http://localhost:${env.PORT}`);
  logger.log(`API docs: http://localhost:${env.PORT}/api/docs`);
  const { resolveDbProvider } = await import('@/database/provider');
  logger.log(
    `DB boot provider: ${resolveDbProvider()} (hot-switch from Admin → Settings if both URIs are set)`,
  );
  logger.log(
    env.PCLOUD_CLIENT_ID || env.PCLOUD_ACCESS_TOKEN
      ? 'Storage: pCloud (connect from Admin → Settings if no access token yet)'
      : 'Storage: pCloud not configured (set PCLOUD_CLIENT_ID / PCLOUD_CLIENT_SECRET)',
  );
}

bootstrap();
