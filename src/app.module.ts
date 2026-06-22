import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { EquipmentsModule } from './equipments/equipments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ClientsModule } from './clients/clients.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        let storage: any = undefined;

        if (redisUrl) {
          storage = new ThrottlerStorageRedisService(redisUrl);
        } else if (redisHost) {
          storage = new ThrottlerStorageRedisService({
            host: redisHost,
            port: redisPort,
            password: redisPassword || undefined,
          });
        }

        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 1 minute (in milliseconds for NestJS Throttler v5+)
              limit: 100, // 100 requests per minute
            },
          ],
          storage,
        };
      },
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    AuditModule,
    UsersModule,
    EquipmentsModule,
    MaintenanceModule,
    DashboardModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
