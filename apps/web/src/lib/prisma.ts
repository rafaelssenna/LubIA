import { PrismaClient } from '@prisma/client';

console.log('========================================');
console.log('[PRISMA LIB] Iniciando módulo prisma.ts');
console.log('[PRISMA LIB] NODE_ENV:', process.env.NODE_ENV);
console.log('[PRISMA LIB] DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[PRISMA LIB] DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

if (process.env.DATABASE_URL) {
  // Log safe preview (first 30 chars)
  console.log('[PRISMA LIB] DATABASE_URL preview:', process.env.DATABASE_URL.substring(0, 30) + '...');
} else {
  console.error('[PRISMA LIB] ERRO: DATABASE_URL não está definida!');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log('[PRISMA LIB] globalForPrisma.prisma já existe?', !!globalForPrisma.prisma);

let prismaInstance: PrismaClient;

try {
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  console.log('[PRISMA LIB] PrismaClient criado/recuperado com sucesso');
} catch (error: any) {
  console.error('[PRISMA LIB] ERRO ao criar PrismaClient:', error?.message);
  console.error('[PRISMA LIB] Stack:', error?.stack);
  throw error;
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  console.log('[PRISMA LIB] Prisma armazenado no global (dev mode)');
}

console.log('[PRISMA LIB] Módulo prisma.ts carregado com sucesso');
console.log('========================================');
