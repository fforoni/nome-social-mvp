import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { verificationRoutes } from './modules/verification/verification.controller';
import { webhookRoutes } from './modules/webhook/webhook.controller';

// Adiciona a propriedade rawBody ao tipo da requisição do Fastify
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}

const server: FastifyInstance = Fastify({
  logger: {
    level: config.LOG_LEVEL,
  },
});

// Adiciona um parser para capturar o corpo da requisição como string (raw)
// Isso é essencial para a verificação da assinatura do webhook.
server.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (req: FastifyRequest, body: string, done) => {
    try {
      req.rawBody = body;
      const json = JSON.parse(body);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  }
);

// Registra plugins
server.register(cors, {
  // Configurar as opções de CORS conforme necessário
  origin: '*', // Para o hackathon, pode ser liberal. Em produção, restrinja.
});

// Registra as rotas da aplicação
server.register(verificationRoutes, { prefix: '/api' });
server.register(webhookRoutes, { prefix: '/api' });

// Rota de Health Check
server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando em http://localhost:${config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
