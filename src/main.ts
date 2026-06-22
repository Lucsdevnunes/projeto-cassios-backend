import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import { SecurityLoggerInterceptor } from './common/interceptors/security-logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy headers behind Cloudflare/Nginx gateways
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Use Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: false, // API server, doesn't serve HTML UI
    crossOriginEmbedderPolicy: false,
  }));

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Configure CORS origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*';

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable input sanitization and security auditing globally
  app.useGlobalInterceptors(
    new SanitizeInterceptor(),
    new SecurityLoggerInterceptor()
  );

  // Increase payload limits for base64 photo uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploads statically
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.use('/uploads', express.static(join(process.cwd(), uploadDir)));

  // Listen on port
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
