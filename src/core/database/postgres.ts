import { PrismaClient } from '@prisma/client';

// Instancia o Prisma Client
// O Prisma gerencia o pool de conexões, então podemos usar uma única instância.
const prisma = new PrismaClient();

export default prisma;
