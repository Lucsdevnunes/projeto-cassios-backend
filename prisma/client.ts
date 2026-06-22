import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

let prisma: PrismaClient;

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (databaseUrl.startsWith('file:') || databaseUrl.includes('.db') || databaseUrl.includes('dev.db')) {
  // Prisma 7 PrismaBetterSqlite3 takes `{ url: string }` directly.
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  prisma = new PrismaClient({ adapter });
} else {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

export { prisma };
export default prisma;
