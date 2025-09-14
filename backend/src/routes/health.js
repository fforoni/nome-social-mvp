async function healthRoutes(fastify, options) {
  // Basic health check
  fastify.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: fastify.config.NODE_ENV,
    };
  });

  // Detailed health check with dependencies
  fastify.get('/detailed', async (request, reply) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: fastify.config.NODE_ENV,
      checks: {},
    };

    try {
      // Check blockchain connection
      const BlockchainService = require('../services/blockchain');
      const blockchainService = new BlockchainService(
        fastify.config.BASE_RPC_URL,
        fastify.config.CONTRACT_ADDRESS,
        fastify.config.MINTER_PRIVATE_KEY
      );

      try {
        const totalSupply = await blockchainService.getTotalSupply();
        health.checks.blockchain = {
          status: 'healthy',
          totalVerifiedIdentities: totalSupply,
          contractAddress: fastify.config.CONTRACT_ADDRESS,
        };
      } catch (error) {
        health.checks.blockchain = {
          status: 'unhealthy',
          error: error.message,
        };
        health.status = 'degraded';
      }

      // Check environment variables
      const requiredEnvVars = ['MINTER_PRIVATE_KEY', 'CONTRACT_ADDRESS', 'BASE_RPC_URL'];
      const missingEnvVars = requiredEnvVars.filter(envVar => !fastify.config[envVar]);
      
      health.checks.environment = {
        status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
        ...(missingEnvVars.length > 0 && { missingVariables: missingEnvVars }),
      };

      if (missingEnvVars.length > 0) {
        health.status = 'unhealthy';
      }

      // System checks
      health.checks.system = {
        status: 'healthy',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        },
        nodeVersion: process.version,
      };

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      return reply.status(statusCode).send(health);
      
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Readiness probe
  fastify.get('/ready', async (request, reply) => {
    try {
      // Check if all required services are ready
      const requiredEnvVars = ['MINTER_PRIVATE_KEY', 'CONTRACT_ADDRESS'];
      const missingEnvVars = requiredEnvVars.filter(envVar => !fastify.config[envVar]);
      
      if (missingEnvVars.length > 0) {
        return reply.status(503).send({
          ready: false,
          reason: 'Missing required environment variables',
          missing: missingEnvVars,
        });
      }

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return reply.status(503).send({
        ready: false,
        reason: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Liveness probe
  fastify.get('/live', async (request, reply) => {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  });
}

module.exports = healthRoutes;