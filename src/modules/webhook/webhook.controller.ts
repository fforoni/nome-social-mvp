import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyWebhookSignature } from '../../core/security/signature.verifier';
import { processPixWebhook } from './webhook.service';

// Este controller precisa do corpo da requisição em formato raw (string)
// para a verificação da assinatura. Vamos configurar o Fastify para isso.
// A configuração será feita no server.ts, mas o código aqui assume que isso foi feito.

export async function webhookRoutes(server: FastifyInstance) {
  server.post('/webhook/pix', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-signature'] as string; // Ajustar o nome do header se necessário

    // 1. Verificar a assinatura do webhook
    // O `request.rawBody` é uma propriedade customizada que adicionaremos via `addContentTypeParser` no server.ts
    const isSignatureValid = verifyWebhookSignature(request.rawBody as string, signature);

    if (!isSignatureValid) {
      console.warn('Assinatura de webhook inválida recebida.');
      return reply.code(401).send({ error: 'Assinatura inválida.' });
    }

    try {
      // 2. Processar o webhook
      const payload = request.body;
      await processPixWebhook(payload as any); // O tipo `any` será refinado com o payload real do PSP

      // 3. Responder ao provedor
      // É crucial responder 200 OK para o provedor, mesmo que a lógica de negócio
      // internamente resulte em um "erro" (ex: CPF duplicado).
      // Isso informa ao provedor que o webhook foi recebido com sucesso e não precisa ser reenviado.
      reply.code(200).send({ status: 'received' });
    } catch (error) {
      // Este erro é um erro interno do nosso sistema (ex: falha no mint).
      // Ainda assim, respondemos 200 ao provedor. O erro já foi logado pelo service.
      console.error('Erro não tratado no processamento do webhook:', error);
      reply.code(200).send({ status: 'received_with_internal_error' });
    }
  });
}
