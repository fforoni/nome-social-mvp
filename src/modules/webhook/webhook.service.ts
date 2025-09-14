import * as crypto from 'crypto';
import { findValidSessionByReferenceCode } from '../verification/verification.repository';
import { isPixTransactionProcessed, isCpfHashUsed, saveCpfAndPixTransaction } from './webhook.repository';
import { mintSbt } from '../../core/blockchain/ethers.service';
import { config } from '../../config';

// Define a estrutura esperada do payload do webhook PIX.
// Isto deve ser ajustado conforme a documentação real do provedor PIX.
interface PixWebhookPayload {
  endToEndId: string;
  valor: string;
  pagador: {
    cpf: string;
  };
  infoPagador: string; // Onde esperamos o código de referência, ex: "adao-12345"
}

/**
 * Cria um hash SHA-256 de uma string (CPF).
 * Em produção, um "pepper" (segredo adicional) do config deveria ser adicionado
 * antes de hashear para maior segurança: SHA256(cpf + config.CPF_PEPPER)
 * @param cpf O CPF a ser hasheado.
 * @returns O hash em formato hexadecimal.
 */
function hashCpf(cpf: string): string {
  // Para o MVP, um hash simples é suficiente. Adicionar um pepper é a próxima etapa.
  return crypto.createHash('sha256').update(cpf).digest('hex');
}

/**
 * Processa o webhook de uma transação PIX.
 * @param payload O corpo da requisição do webhook.
 */
export async function processPixWebhook(payload: PixWebhookPayload) {
  // 1. Checagem de Idempotência
  if (await isPixTransactionProcessed(payload.endToEndId)) {
    console.log(`[IDEMPOTÊNCIA] Transação ${payload.endToEndId} já processada.`);
    return { status: 'DUPLICATE', message: 'Transação já processada.' };
  }

  // 2. Encontrar a Sessão de Verificação
  const referenceCode = payload.infoPagador;
  const session = await findValidSessionByReferenceCode(referenceCode);
  if (!session) {
    console.warn(`Sessão com código de referência "${referenceCode}" não encontrada ou expirada.`);
    return { status: 'SESSION_NOT_FOUND', message: 'Sessão de verificação não encontrada ou expirada.' };
  }

  // 3. Checagem de Unicidade do CPF
  const cpfHash = hashCpf(payload.pagador.cpf);
  if (await isCpfHashUsed(cpfHash)) {
    console.warn(`CPF com hash ${cpfHash} já foi utilizado.`);
    // Ainda assim, marcamos a transação PIX como processada para evitar reprocessamento
    await saveCpfAndPixTransaction(cpfHash, payload.endToEndId); // Salva apenas o PixId neste caso
    return { status: 'CPF_ALREADY_USED', message: 'CPF já utilizado para emitir um SBT.' };
  }

  // 4. Mint do SBT (operação crítica)
  try {
    await mintSbt(session.walletAddress);
  } catch (error) {
    console.error(`Falha CRÍTICA ao tentar fazer o mint para ${session.walletAddress}. Erro:`, error);
    // IMPORTANTE: Não salvamos o estado aqui. O erro foi logado.
    // A ausência do `endToEndId` no banco permitirá que esta transação seja reprocessada
    // por um mecanismo de retry ou manualmente.
    throw new Error('Falha na emissão do SBT.');
  }

  // 5. Salvar o estado com sucesso
  // Apenas após o mint ser bem-sucedido, salvamos o hash do CPF e o ID da transação.
  await saveCpfAndPixTransaction(cpfHash, payload.endToEndId);

  console.log(`[SUCESSO] SBT emitido para ${session.walletAddress} e estado salvo.`);
  return { status: 'SUCCESS', message: 'SBT emitido com sucesso.' };
}
