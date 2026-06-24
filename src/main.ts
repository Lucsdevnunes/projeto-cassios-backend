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

  // Use Helmet for security headers (OWASP A05)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://*.supabase.co', 'https://*.railway.app', 'https://sistema.emporiodoar.com.br'],
        imgSrc: ["'self'", 'data:', 'https://*.supabase.co', 'https://*.supabase.in'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        frameAncestors: ["'self'"], // Block Clickjacking (X-Frame-Options sibling)
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'sameorigin' }, // X-Frame-Options SAMEORIGIN
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true, // X-Content-Type-Options nosniff
    referrerPolicy: { policy: 'no-referrer' },
  }));

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Configure CORS origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.includes('*') || 
                        allowedOrigins.some(allowed => origin.startsWith(allowed)) || 
                        origin === 'http://localhost' || 
                        origin === 'https://localhost' || 
                        origin.startsWith('capacitor://');
                        
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
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
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
