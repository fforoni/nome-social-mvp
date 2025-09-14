const BlockchainService = require('../services/blockchain');

async function verifyRoutes(fastify, options) {
  // Initialize blockchain service
  let blockchainService;
  
  fastify.addHook('onReady', async () => {
    blockchainService = new BlockchainService(
      fastify.config.BASE_RPC_URL,
      fastify.config.CONTRACT_ADDRESS,
      fastify.config.MINTER_PRIVATE_KEY
    );
  });

  // Check verification status for an address
  fastify.get('/status/:address', {
    schema: {
      params: {
        type: 'object',
        required: ['address'],
        properties: {
          address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { address } = request.params;
      
      const isVerified = await blockchainService.isUserVerified(address);
      
      if (!isVerified) {
        return {
          address,
          isVerified: false,
          tokenId: null,
          verificationDate: null,
        };
      }

      const tokenId = await blockchainService.getUserTokenId(address);
      
      return {
        address,
        isVerified: true,
        tokenId,
        verificationDate: null, // We could fetch this from blockchain events if needed
      };
      
    } catch (error) {
      fastify.log.error(error, 'Error checking verification status');
      return reply.status(400).send({
        error: error.message,
      });
    }
  });

  // Get contract statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const totalSupply = await blockchainService.getTotalSupply();
      
      return {
        totalVerifiedIdentities: totalSupply,
        contractAddress: fastify.config.CONTRACT_ADDRESS,
        network: 'Base',
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      fastify.log.error(error, 'Error fetching contract stats');
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  // Initiate PIX payment (returns payment data for frontend)
  fastify.post('/initiate-payment', {
    schema: {
      body: {
        type: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { walletAddress } = request.body;
      
      // Check if user is already verified
      const isAlreadyVerified = await blockchainService.isUserVerified(walletAddress);
      if (isAlreadyVerified) {
        return reply.status(400).send({
          error: 'User is already verified',
          isVerified: true,
        });
      }

      // Create PIX payment data
      const PIXService = require('../services/pix');
      const pixService = new PIXService(fastify.config.PIX_WEBHOOK_SECRET);
      
      const paymentData = pixService.createPaymentData(walletAddress);
      
      fastify.log.info({
        walletAddress,
        reference: paymentData.reference,
      }, 'PIX payment initiated');
      
      return {
        success: true,
        paymentData,
        instructions: {
          amount: 'R$ 0.01',
          description: 'Send exactly R$ 0.01 via PIX to verify your Brazilian identity',
          steps: [
            '1. Open your bank app',
            '2. Go to PIX section',
            '3. Send R$ 0.01 to the provided PIX key',
            '4. Wait for verification (usually takes 1-2 minutes)',
            '5. Your SBT will be minted automatically to your wallet'
          ],
        },
      };
      
    } catch (error) {
      fastify.log.error(error, 'Error initiating PIX payment');
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  // Check payment status (for frontend polling)
  fastify.get('/payment-status/:walletAddress', {
    schema: {
      params: {
        type: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { walletAddress } = request.params;
      
      const isVerified = await blockchainService.isUserVerified(walletAddress);
      
      if (isVerified) {
        const tokenId = await blockchainService.getUserTokenId(walletAddress);
        return {
          status: 'completed',
          isVerified: true,
          tokenId,
          message: 'Identity verification completed successfully!',
        };
      }
      
      return {
        status: 'pending',
        isVerified: false,
        message: 'Waiting for PIX payment confirmation...',
      };
      
    } catch (error) {
      fastify.log.error(error, 'Error checking payment status');
      return reply.status(500).send({
        error: error.message,
      });
    }
  });
}

module.exports = verifyRoutes;