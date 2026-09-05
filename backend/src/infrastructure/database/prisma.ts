import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}


export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

let dbConnected = false;

export function isDbConnected(): boolean {
  return dbConnected || process.env.NODE_ENV === 'test';
}

export function setDbConnected(state: boolean): void {
  dbConnected = state;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    dbConnected = true;
  } catch (err) {
    dbConnected = false;
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  dbConnected = false;
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
}
