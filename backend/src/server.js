const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Environment configuration
fastify.register(require('@fastify/env'), {
  confKey: 'config',
  schema: {
    type: 'object',
    required: ['MINTER_PRIVATE_KEY', 'CONTRACT_ADDRESS'],
    properties: {
      PORT: {
        type: 'string',
        default: '3000',
      },
      HOST: {
        type: 'string',
        default: '0.0.0.0',
      },
      NODE_ENV: {
        type: 'string',
        default: 'development',
      },
      MINTER_PRIVATE_KEY: {
        type: 'string',
      },
      CONTRACT_ADDRESS: {
        type: 'string',
      },
      BASE_RPC_URL: {
        type: 'string',
        default: 'https://mainnet.base.org',
      },
      PIX_WEBHOOK_SECRET: {
        type: 'string',
        default: 'default-webhook-secret-change-in-production',
      },
      ALLOWED_ORIGINS: {
        type: 'string',
        default: 'http://localhost:3001',
      },
    },
  },
  dotenv: true,
});

// Security middleware
fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: false, // Disable for API usage
});

fastify.register(require('@fastify/cors'), {
  origin: (origin, callback) => {
    const allowedOrigins = fastify.config.ALLOWED_ORIGINS.split(',');
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
});

// Rate limiting
fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
});

// Register routes
fastify.register(require('./routes/webhook'), { prefix: '/webhook' });
fastify.register(require('./routes/health'), { prefix: '/health' });
fastify.register(require('./routes/verify'), { prefix: '/verify' });

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;
  
  fastify.log.error(error, 'Unhandled error');
  
  reply.status(statusCode).send({
    error: {
      message: error.message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
});

// Graceful shutdown
const gracefulClose = (signal) => {
  fastify.log.info(`Received ${signal}, closing server...`);
  fastify.close(() => {
    fastify.log.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulClose('SIGTERM'));
process.on('SIGINT', () => gracefulClose('SIGINT'));

// Start server
const start = async () => {
  try {
    await fastify.ready();
    
    const port = parseInt(fastify.config.PORT);
    const host = fastify.config.HOST;
    
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on http://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = fastify;