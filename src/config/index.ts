import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega as variáveis de ambiente do arquivo .env em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/**
 * Define o schema para as variáveis de ambiente usando Zod.
 * Isso garante que todas as variáveis necessárias estão presentes e com o tipo correto.
 */
const envSchema = z.object({
  // URL de conexão com o banco de dados PostgreSQL
  DATABASE_URL: z.string().url(),

  // Chave privada da carteira "minter". Deve ser uma string hexadecimal.
  MINTER_PRIVATE_KEY: z.string().startsWith('0x'),

  // Segredo para verificação da assinatura do webhook
  WEBHOOK_SECRET: z.string().min(1),

  // Nível de log para a aplicação
  LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error']).default('info'),

  // Porta do servidor
  PORT: z.coerce.number().default(3000),

  // URL do nó RPC da Base
  BASE_RPC_URL: z.string().url(),

  // Endereço do smart contract
  SBT_CONTRACT_ADDRESS: z.string().startsWith('0x'),
});

// Valida as variáveis de ambiente do sistema (process.env)
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Erro nas variáveis de ambiente:',
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error('Variáveis de ambiente inválidas ou ausentes.');
}

// Exporta o objeto de configuração tipado e validado
export const config = parsedEnv.data;
