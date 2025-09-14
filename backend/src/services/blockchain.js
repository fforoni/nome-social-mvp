const { ethers } = require('ethers');

// Brazilian Identity SBT Contract ABI (minimal version for minting)
const CONTRACT_ABI = [
  "function mint(address to, bytes32 cpfHash) external",
  "function isVerified(address user) external view returns (bool)",
  "function isCPFUsed(bytes32 cpfHash) external view returns (bool)",
  "function getTokenId(address user) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "event IdentityVerified(address indexed user, uint256 indexed tokenId, bytes32 cpfHash)"
];

class BlockchainService {
  constructor(rpcUrl, contractAddress, privateKey) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.wallet);
  }

  /**
   * Mint a new SBT for a verified user
   * @param {string} userAddress - The user's Ethereum address
   * @param {string} cpf - The user's CPF (will be hashed)
   * @returns {Promise<Object>} Transaction result
   */
  async mintSBT(userAddress, cpf) {
    try {
      // Validate inputs
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }

      if (!this.isValidCPF(cpf)) {
        throw new Error('Invalid CPF format');
      }

      // Hash the CPF for privacy
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes(cpf));

      // Check if user is already verified
      const isAlreadyVerified = await this.contract.isVerified(userAddress);
      if (isAlreadyVerified) {
        throw new Error('User is already verified');
      }

      // Check if CPF has been used
      const isCPFUsed = await this.contract.isCPFUsed(cpfHash);
      if (isCPFUsed) {
        throw new Error('CPF has already been used for verification');
      }

      // Estimate gas
      const gasEstimate = await this.contract.mint.estimateGas(userAddress, cpfHash);
      const gasLimit = gasEstimate * BigInt(110) / BigInt(100); // Add 10% buffer

      // Execute mint transaction
      const tx = await this.contract.mint(userAddress, cpfHash, {
        gasLimit: gasLimit.toString(),
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      // Parse the IdentityVerified event
      const event = receipt.logs.find(log => {
        try {
          return this.contract.interface.parseLog(log).name === 'IdentityVerified';
        } catch {
          return false;
        }
      });

      let tokenId = null;
      if (event) {
        const parsedEvent = this.contract.interface.parseLog(event);
        tokenId = parsedEvent.args.tokenId.toString();
      }

      return {
        success: true,
        txHash: receipt.hash,
        tokenId,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to mint SBT: ${error.message}`);
    }
  }

  /**
   * Check if a user is verified (has an SBT)
   * @param {string} userAddress - The user's Ethereum address
   * @returns {Promise<boolean>} True if user is verified
   */
  async isUserVerified(userAddress) {
    try {
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }
      return await this.contract.isVerified(userAddress);
    } catch (error) {
      throw new Error(`Failed to check verification status: ${error.message}`);
    }
  }

  /**
   * Get user's token ID
   * @param {string} userAddress - The user's Ethereum address
   * @returns {Promise<string|null>} Token ID or null if not verified
   */
  async getUserTokenId(userAddress) {
    try {
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }
      const tokenId = await this.contract.getTokenId(userAddress);
      return tokenId.toString() === '0' ? null : tokenId.toString();
    } catch (error) {
      throw new Error(`Failed to get token ID: ${error.message}`);
    }
  }

  /**
   * Get total number of verified identities
   * @returns {Promise<string>} Total supply
   */
  async getTotalSupply() {
    try {
      const totalSupply = await this.contract.totalSupply();
      return totalSupply.toString();
    } catch (error) {
      throw new Error(`Failed to get total supply: ${error.message}`);
    }
  }

  /**
   * Validate CPF format
   * @param {string} cpf - CPF string
   * @returns {boolean} True if valid format
   */
  isValidCPF(cpf) {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Check if it has 11 digits
    if (cleanCPF.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Calculate first verification digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let firstDigit = 11 - (sum % 11);
    if (firstDigit >= 10) firstDigit = 0;
    
    // Calculate second verification digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    let secondDigit = 11 - (sum % 11);
    if (secondDigit >= 10) secondDigit = 0;
    
    // Verify digits
    return (
      firstDigit === parseInt(cleanCPF.charAt(9)) &&
      secondDigit === parseInt(cleanCPF.charAt(10))
    );
  }

  /**
   * Clean and format CPF
   * @param {string} cpf - Raw CPF input
   * @returns {string} Cleaned CPF (digits only)
   */
  formatCPF(cpf) {
    return cpf.replace(/\D/g, '');
  }
}

module.exports = BlockchainService;