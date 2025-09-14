import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createVerificationSession } from './verification.service';

// Schema para validar o corpo da requisição de criação de sessão
const createSessionSchema = z.object({
  walletAddress: z.string().startsWith('0x').length(42),
});

export async function verificationRoutes(server: FastifyInstance) {
  server.post(
    '/session',
    {
      schema: {
        body: createSessionSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { walletAddress } = request.body as z.infer<typeof createSessionSchema>;

        const result = await createVerificationSession(walletAddress);

        reply.code(201).send(result);
      } catch (error) {
        console.error('❌ Erro ao criar sessão de verificação:', error);
        reply.code(500).send({ error: 'Erro interno ao criar sessão.' });
      }
    }
  );
}
