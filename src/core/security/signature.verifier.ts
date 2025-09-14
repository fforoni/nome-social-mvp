import * as crypto from 'crypto';
import { config } from '../../config';

/**
 * Verifica a assinatura de um webhook usando HMAC-SHA256.
 *
 * @param body O corpo da requisição (raw body).
 * @param signature O valor do header X-Signature (ou similar).
 * @returns `true` se a assinatura for válida, `false` caso contrário.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!body || !signature) {
    return false;
  }

  try {
    // Cria o hash HMAC usando o segredo compartilhado.
    const hmac = crypto.createHmac('sha256', config.WEBHOOK_SECRET);
    const computedSignature = hmac.update(body).digest('hex');

    // Compara as assinaturas de forma segura para prevenir "timing attacks".
    const sourceBuffer = Buffer.from(signature);
    const comparisonBuffer = Buffer.from(computedSignature);

    if (sourceBuffer.length !== comparisonBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(sourceBuffer, comparisonBuffer);
  } catch (error) {
    console.error('❌ Erro ao verificar a assinatura do webhook:', error);
    return false;
  }
}
