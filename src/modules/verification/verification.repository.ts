import prisma from '../../core/database/postgres';

const SESSION_TTL_MINUTES = 15; // A sessão expira em 15 minutos

/**
 * Cria uma nova sessão de verificação no banco de dados.
 * @param walletAddress O endereço da carteira do usuário.
 * @param referenceCode O código de referência único gerado para esta sessão.
 * @returns O objeto da sessão de verificação criada.
 */
export async function createSession(walletAddress: string, referenceCode: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);

  return prisma.verificationSession.create({
    data: {
      walletAddress,
      referenceCode,
      expiresAt,
    },
  });
}

/**
 * Encontra uma sessão de verificação válida pelo código de referência.
 * @param referenceCode O código de referência extraído do PIX.
 * @returns A sessão de verificação se encontrada e não expirada, caso contrário null.
 */
export async function findValidSessionByReferenceCode(referenceCode: string) {
  return prisma.verificationSession.findFirst({
    where: {
      referenceCode,
      expiresAt: {
        gt: new Date(), // Verifica se a sessão não expirou
      },
    },
  });
}
