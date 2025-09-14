const crypto = require('crypto');

class PIXService {
  constructor(webhookSecret) {
    this.webhookSecret = webhookSecret;
  }

  /**
   * Verify PIX webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Signature from headers
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');
      
      const receivedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Process PIX webhook payload
   * @param {Object} payload - PIX webhook payload
   * @returns {Object} Processed payment data
   */
  processWebhookPayload(payload) {
    try {
      // Extract relevant information from PIX webhook
      // Note: This is a generic structure - adjust based on your PIX provider
      const {
        transaction_id,
        amount,
        currency = 'BRL',
        payer,
        status,
        created_at,
        metadata = {}
      } = payload;

      // Validate required fields
      if (!transaction_id || !amount || !payer || !status) {
        throw new Error('Missing required fields in PIX payload');
      }

      // Validate amount (should be exactly R$ 0.01)
      const expectedAmount = 0.01;
      if (parseFloat(amount) !== expectedAmount) {
        throw new Error(`Invalid payment amount. Expected ${expectedAmount}, got ${amount}`);
      }

      // Validate currency
      if (currency !== 'BRL') {
        throw new Error(`Invalid currency. Expected BRL, got ${currency}`);
      }

      // Validate status
      if (status !== 'completed' && status !== 'paid') {
        throw new Error(`Invalid payment status: ${status}`);
      }

      // Extract payer information
      const { cpf, name, email, wallet_address } = payer;
      
      if (!cpf) {
        throw new Error('CPF is required in payer information');
      }

      if (!wallet_address) {
        throw new Error('Wallet address is required in payer information');
      }

      return {
        transactionId: transaction_id,
        amount: parseFloat(amount),
        currency,
        cpf: this.cleanCPF(cpf),
        payerName: name,
        payerEmail: email,
        walletAddress: wallet_address,
        status,
        createdAt: created_at || new Date().toISOString(),
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to process PIX payload: ${error.message}`);
    }
  }

  /**
   * Validate PIX payment for SBT minting
   * @param {Object} paymentData - Processed payment data
   * @returns {Object} Validation result
   */
  validatePaymentForMinting(paymentData) {
    const errors = [];
    const warnings = [];

    // Validate CPF format
    if (!this.isValidCPFFormat(paymentData.cpf)) {
      errors.push('Invalid CPF format');
    }

    // Validate wallet address format
    if (!this.isValidEthereumAddress(paymentData.walletAddress)) {
      errors.push('Invalid Ethereum wallet address');
    }

    // Validate amount
    if (paymentData.amount !== 0.01) {
      errors.push('Invalid payment amount');
    }

    // Validate status
    if (!['completed', 'paid'].includes(paymentData.status)) {
      errors.push('Payment not completed');
    }

    // Check for suspicious patterns
    if (!paymentData.payerName || paymentData.payerName.length < 2) {
      warnings.push('Suspicious payer name');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      paymentData
    };
  }

  /**
   * Clean CPF string (remove non-digits)
   * @param {string} cpf - Raw CPF
   * @returns {string} Cleaned CPF
   */
  cleanCPF(cpf) {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Validate CPF format
   * @param {string} cpf - CPF string
   * @returns {boolean} True if valid
   */
  isValidCPFFormat(cpf) {
    const cleanCPF = this.cleanCPF(cpf);
    
    // Basic length check
    if (cleanCPF.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    return true;
  }

  /**
   * Validate Ethereum address format
   * @param {string} address - Ethereum address
   * @returns {boolean} True if valid
   */
  isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Generate transaction reference for logging
   * @param {Object} paymentData - Payment data
   * @returns {string} Transaction reference
   */
  generateTransactionReference(paymentData) {
    const timestamp = Date.now();
    const cpfHash = crypto.createHash('sha256').update(paymentData.cpf).digest('hex').substring(0, 8);
    return `PIX_${timestamp}_${cpfHash}`;
  }

  /**
   * Create PIX payment link/QR code data (for frontend integration)
   * @param {string} walletAddress - User's wallet address
   * @param {string} amount - Payment amount (default: 0.01)
   * @returns {Object} PIX payment data
   */
  createPaymentData(walletAddress, amount = '0.01') {
    // This would typically integrate with your PIX payment provider
    // For now, returning a structure that can be used by frontend
    return {
      amount: amount,
      currency: 'BRL',
      description: 'Brazilian Identity Verification - SBT Mint',
      metadata: {
        wallet_address: walletAddress,
        service: 'brazilian-identity-sbt',
        timestamp: Date.now()
      },
      // In a real implementation, you would generate a PIX key or QR code here
      pixKey: process.env.PIX_RECEIVER_KEY || 'your-pix-key@email.com',
      reference: this.generateTransactionReference({ cpf: 'pending' })
    };
  }
}

module.exports = PIXService;