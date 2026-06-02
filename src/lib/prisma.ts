import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL;
  // Resolve relative file: URLs to absolute paths so libsql can find the DB
  if (!dbUrl || dbUrl === 'undefined') {
    dbUrl = `file:${path.resolve(process.cwd(), 'dev.db')}`;
  } else if (dbUrl.startsWith('file:./') || dbUrl.startsWith('file:dev.db')) {
    const relativePath = dbUrl.replace(/^file:/, '');
    dbUrl = `file:${path.resolve(process.cwd(), relativePath)}`;
  }
  const adapter = new PrismaLibSql({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
