import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/db',
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
});
