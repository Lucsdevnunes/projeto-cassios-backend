import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getHealth() {
    const diagnostics: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        DATABASE_URL_PRESENT: !!process.env.DATABASE_URL,
        REDIS_URL_PRESENT: !!process.env.REDIS_URL,
        JWT_SECRET_PRESENT: !!process.env.JWT_SECRET,
      },
      database: 'unknown',
      redis: 'unknown',
    };

    // 1. Test Prisma Database Connection
    try {
      const start = Date.now();
      const count = await this.prisma.usuario.count();
      diagnostics.database = {
        status: 'connected',
        usersCount: count,
        responseTimeMs: Date.now() - start,
      };
    } catch (dbError: any) {
      diagnostics.status = 'error';
      diagnostics.database = {
        status: 'error',
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack,
      };
    }

    // 2. Test Redis connection if configured
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');
    if (redisUrl || redisHost) {
      try {
        const Redis = require('ioredis');
        const client = redisUrl ? new Redis(redisUrl, { connectTimeout: 3000 }) : new Redis({
          host: redisHost,
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
          connectTimeout: 3000,
        });

        // Set error handler to prevent process crash
        client.on('error', (err: any) => {
          console.error('Diagnostic Redis Client error event:', err.message);
        });

        const start = Date.now();
        const pong = await client.ping();
        diagnostics.redis = {
          status: 'connected',
          pingResponse: pong,
          responseTimeMs: Date.now() - start,
        };
        await client.quit();
      } catch (redisError: any) {
        diagnostics.status = 'error';
        diagnostics.redis = {
          status: 'error',
          message: redisError.message,
          stack: redisError.stack,
        };
      }
    } else {
      diagnostics.redis = {
        status: 'disabled',
        reason: 'No REDIS_URL or REDIS_HOST provided',
      };
    }

    return diagnostics;
  }
}

