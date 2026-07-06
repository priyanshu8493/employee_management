import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // 1. Create the database connection pool WITH the Aiven SSL bypass
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // 2. Inject the pool into the Prisma pg adapter
  const adapter = new PrismaPg(pool);

  // 3. Pass the adapter to Prisma (Mandatory for Prisma v7+)
  return new PrismaClient({ adapter });
};

// Next.js development singleton pattern
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;