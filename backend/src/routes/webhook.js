const BlockchainService = require('../services/blockchain');
const PIXService = require('../services/pix');

async function webhookRoutes(fastify, options) {
  // Initialize services
  let blockchainService;
  let pixService;
  
  fastify.addHook('onReady', async () => {
    blockchainService = new BlockchainService(
      fastify.config.BASE_RPC_URL,
      fastify.config.CONTRACT_ADDRESS,
      fastify.config.MINTER_PRIVATE_KEY
    );
    
    pixService = new PIXService(fastify.config.PIX_WEBHOOK_SECRET);
  });

  // PIX webhook endpoint
  fastify.post('/pix', {
    schema: {
      body: {
        type: 'object',
        required: ['transaction_id', 'amount', 'payer', 'status'],
        properties: {
          transaction_id: { type: 'string' },
          amount: { type: ['string', 'number'] },
          currency: { type: 'string' },
          payer: {
            type: 'object',
            required: ['cpf', 'wallet_address'],
            properties: {
              cpf: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              wallet_address: { type: 'string' },
            },
          },
          status: { type: 'string' },
          created_at: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    fastify.log.info({
      requestId,
      body: request.body,
    }, 'PIX webhook received');

    try {
      // Verify webhook signature
      const signature = request.headers['x-signature'] || request.headers['signature'];
      const rawBody = JSON.stringify(request.body);
      
      if (!pixService.verifyWebhookSignature(rawBody, signature)) {
        fastify.log.warn({ requestId }, 'Invalid webhook signature');
        return reply.status(401).send({
          error: 'Invalid webhook signature',
          requestId,
        });
      }

      // Process PIX webhook payload
      const paymentData = pixService.processWebhookPayload(request.body);
      
      fastify.log.info({
        requestId,
        transactionId: paymentData.transactionId,
        cpf: paymentData.cpf.substring(0, 3) + '***', // Log partial CPF for privacy
        walletAddress: paymentData.walletAddress,
        amount: paymentData.amount,
      }, 'Payment data processed');

      // Validate payment for minting
      const validation = pixService.validatePaymentForMinting(paymentData);
      
      if (!validation.isValid) {
        fastify.log.warn({
          requestId,
          errors: validation.errors,
          warnings: validation.warnings,
        }, 'Payment validation failed');
        
        return reply.status(400).send({
          error: 'Payment validation failed',
          details: validation.errors,
          warnings: validation.warnings,
          requestId,
        });
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        fastify.log.warn({
          requestId,
          warnings: validation.warnings,
        }, 'Payment validation warnings');
      }

      // Check if user is already verified
      const isAlreadyVerified = await blockchainService.isUserVerified(paymentData.walletAddress);
      if (isAlreadyVerified) {
        fastify.log.info({
          requestId,
          walletAddress: paymentData.walletAddress,
        }, 'User is already verified, skipping mint');
        
        return reply.send({
          success: true,
          message: 'User is already verified',
          alreadyVerified: true,
          requestId,
        });
      }

      // Attempt to mint SBT
      fastify.log.info({
        requestId,
        walletAddress: paymentData.walletAddress,
      }, 'Attempting to mint SBT');

      const mintResult = await blockchainService.mintSBT(
        paymentData.walletAddress,
        paymentData.cpf
      );

      const processingTime = Date.now() - startTime;
      
      fastify.log.info({
        requestId,
        txHash: mintResult.txHash,
        tokenId: mintResult.tokenId,
        processingTime,
      }, 'SBT minted successfully');

      // Return success response
      return reply.send({
        success: true,
        message: 'Identity verified and SBT minted successfully',
        data: {
          transactionHash: mintResult.txHash,
          tokenId: mintResult.tokenId,
          blockNumber: mintResult.blockNumber,
          gasUsed: mintResult.gasUsed,
          processingTime,
        },
        requestId,
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      fastify.log.error({
        requestId,
        error: error.message,
        stack: error.stack,
        processingTime,
      }, 'PIX webhook processing failed');

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message.includes('Invalid') || 
          error.message.includes('already verified') ||
          error.message.includes('already been used')) {
        statusCode = 400;
      }

      return reply.status(statusCode).send({
        error: error.message,
        requestId,
        processingTime,
      });
    }
  });

  // Test webhook endpoint (for development)
  if (process.env.NODE_ENV === 'development') {
    fastify.post('/pix/test', async (request, reply) => {
      const testPayload = {
        transaction_id: `test_${Date.now()}`,
        amount: '0.01',
        currency: 'BRL',
        payer: {
          cpf: '12345678901', // Valid test CPF
          name: 'Test User',
          email: 'test@example.com',
          wallet_address: '0x742d35Cc6634C0532925a3b8D295A00F95b8E08E', // Test address
        },
        status: 'completed',
        created_at: new Date().toISOString(),
        metadata: {
          test: true,
        },
        ...request.body,
      };

      // Add test signature
      const signature = 'sha256=' + require('crypto')
        .createHmac('sha256', fastify.config.PIX_WEBHOOK_SECRET)
        .update(JSON.stringify(testPayload), 'utf8')
        .digest('hex');

      // Simulate webhook call
      return fastify.inject({
        method: 'POST',
        url: '/webhook/pix',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
        },
        payload: testPayload,
      }).then(response => {
        return reply.send({
          testPayload,
          signature,
          response: {
            statusCode: response.statusCode,
            body: JSON.parse(response.body),
          },
        });
      });
    });
  }
}

module.exports = webhookRoutes;