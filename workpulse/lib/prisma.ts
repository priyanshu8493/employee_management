import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL!;
  const connectionString = databaseUrl.split("?")[0];
  const isLocal =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const pool = new Pool({
    connectionString,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    max: isLocal ? 2 : 10,
    min: isLocal ? 0 : 2,
    idleTimeoutMillis: isLocal ? 10000 : 30000,
    connectionTimeoutMillis: isLocal ? 5000 : 30000,
    keepAlive: true,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: isLocal ? ['error', 'warn'] : ['error'] });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;