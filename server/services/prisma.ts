import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

try {
  prisma = new PrismaClient();
} catch (err) {
  console.warn('[Prisma] Failed to initialize PrismaClient, falling back to JSON db adapter:', err);
  prisma = null;
}

export { prisma };
