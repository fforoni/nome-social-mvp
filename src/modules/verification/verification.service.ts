import { createSession } from './verification.repository';
import * as crypto from 'crypto';

/**
 * Gera um código de referência único e legível.
 * Exemplo: "sol-a4f8"
 * @returns O código de referência.
 */
function generateReferenceCode(): string {
  const words = ['sol', 'lua', 'rio', 'mar', 'flor', 'ceu', 'luz', 'paz', 'cor', 'som'];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomHex = crypto.randomBytes(2).toString('hex');
  return `${randomWord}-${randomHex}`;
}

/**
 * Cria uma nova sessão de verificação para um usuário.
 * @param walletAddress O endereço da carteira do usuário.
 * @returns O código de referência para o usuário usar no PIX.
 */
export async function createVerificationSession(walletAddress: string) {
  // Poderíamos adicionar uma lógica para verificar se já existe uma sessão ativa para esta carteira.
  // Para o MVP, vamos manter simples e criar uma nova.

  const referenceCode = generateReferenceCode();

  await createSession(walletAddress, referenceCode);

  return { referenceCode };
}
