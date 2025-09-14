import prisma from '../../core/database/postgres';

/**
 * Verifica se um endToEndId de uma transação PIX já foi processado.
 * @param endToEndId O ID da transação PIX.
 * @returns `true` se já foi processado, `false` caso contrário.
 */
export async function isPixTransactionProcessed(endToEndId: string): Promise<boolean> {
  const transaction = await prisma.processedPixTransaction.findUnique({
    where: { endToEndId },
  });
  return !!transaction;
}

/**
 * Verifica se um hash de CPF já foi utilizado.
 * @param cpfHash O hash do CPF.
 * @returns `true` se já foi utilizado, `false` caso contrário.
 */
export async function isCpfHashUsed(cpfHash: string): Promise<boolean> {
  const usedHash = await prisma.uniqueCpfHash.findUnique({
    where: { cpfHash },
  });
  return !!usedHash;
}

/**
 * Tenta salvar o hash do CPF e o ID da transação PIX de forma atômica.
 * A transação garante que ambas as operações (ou nenhuma) sejam concluídas.
 * Isso previne um estado inconsistente onde o mint ocorre mas os dados de controle não são salvos.
 * @param cpfHash O hash do CPF a ser salvo para garantir unicidade.
 * @param endToEndId O ID da transação a ser salvo para garantir idempotência.
 */
export async function saveCpfAndPixTransaction(cpfHash: string, endToEndId: string) {
  return prisma.$transaction([
    prisma.uniqueCpfHash.create({
      data: { cpfHash },
    }),
    prisma.processedPixTransaction.create({
      data: { endToEndId },
    }),
  ]);
}
