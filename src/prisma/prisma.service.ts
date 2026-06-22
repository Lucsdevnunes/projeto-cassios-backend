import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
    let adapter;
    if (databaseUrl.startsWith('file:') || databaseUrl.includes('.db') || databaseUrl.includes('dev.db')) {
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
      adapter = new PrismaBetterSqlite3({ url: databaseUrl });
    } else {
      const { PrismaPg } = require('@prisma/adapter-pg');
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: databaseUrl });
      adapter = new PrismaPg(pool);
    }
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
