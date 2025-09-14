# Brazilian Identity SBT - PIX-to-SBT Mint System

A decentralized Brazilian identity verification system that uses PIX payments to mint Soulbound Tokens (SBTs) on Base L2. Users send a R$ 0.01 PIX payment, the backend validates their unique CPF, and automatically mints a non-transferable identity token.

## 🇧🇷 Overview

This system provides a secure, cost-effective way for Brazilians to verify their identity on-chain using the existing PIX payment infrastructure. Key features:

- **PIX Integration**: Use Brazil's instant payment system for identity verification
- **CPF Validation**: Automatic validation of Brazilian CPF documents
- **Soulbound Tokens**: Non-transferable identity tokens on Base L2
- **Privacy-First**: Only hashed CPF data is stored on-chain
- **One Identity per CPF**: Prevents duplicate verifications

## 🏗️ Architecture

### Smart Contracts (Solidity/OpenZeppelin)
- **BrazilianIdentitySBT**: ERC721-based soulbound token contract
- **Base L2 Deployment**: Low-cost, fast transactions
- **Access Control**: Secure minter role for backend service
- **Anti-Transfer**: Implements soulbound functionality

### Backend (Node.js/Fastify)
- **PIX Webhook Handler**: Processes payment notifications
- **CPF Validation**: Validates Brazilian CPF format and uniqueness
- **Blockchain Integration**: Secure interaction with smart contracts  
- **Security Features**: Rate limiting, CORS, request validation

### Frontend (React/Next.js)
- **Wallet Connection**: RainbowKit integration for Web3 wallets
- **PIX Payment Flow**: User-friendly payment interface
- **Real-time Updates**: Status polling and notifications
- **Responsive Design**: Mobile-first Brazilian user experience

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### 1. Clone and Install
```bash
git clone https://github.com/fforoni/nome-social-mvp.git
cd nome-social-mvp
npm install
```

### 2. Setup Environment Variables

**Backend Configuration:**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

**Frontend Configuration:**  
```bash
cd frontend
cp .env.example .env.local
# Add your WalletConnect project ID
```

**Contracts Configuration:**
```bash
cd contracts  
cp .env.example .env
# Add your private keys and API keys
```

### 3. Deploy Smart Contract
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network base-sepolia
```

### 4. Start Services

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend  
npm install
npm run dev
```

Visit http://localhost:3001 to see the application.

## 📋 Environment Variables

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `MINTER_PRIVATE_KEY` | Private key for minting SBTs | `0x...` |
| `CONTRACT_ADDRESS` | Deployed contract address | `0x...` |
| `BASE_RPC_URL` | Base network RPC endpoint | `https://mainnet.base.org` |
| `PIX_WEBHOOK_SECRET` | Secret for webhook signature verification | `your-secret` |
| `PIX_RECEIVER_KEY` | PIX key for receiving payments | `your-pix@email.com` |

### Frontend (.env.local)
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | `your-project-id` |

## 🧪 Testing

### Smart Contract Tests
```bash
cd contracts
npm test
npm run coverage
```

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Integration Tests
```bash
# Test webhook endpoint (development only)
curl -X POST http://localhost:3000/webhook/pix/test \
  -H "Content-Type: application/json" \
  -d '{"payer": {"wallet_address": "0x..."}}'
```

## 🔒 Security Features

### Smart Contract Security
- **Access Control**: Only authorized minter can mint tokens
- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard
- **Pausable**: Emergency stop functionality
- **CPF Uniqueness**: Prevents duplicate verifications
- **Soulbound**: Non-transferable tokens

### Backend Security  
- **Webhook Signatures**: Cryptographic signature verification
- **Rate Limiting**: Prevents spam and DDoS attacks
- **CORS Protection**: Restricts cross-origin requests
- **Input Validation**: Comprehensive request validation
- **Private Key Security**: Environment-based key management

## 🏃‍♂️ Production Deployment

### Smart Contract Deployment
1. Set production environment variables
2. Deploy to Base mainnet:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network base
   ```
3. Verify contract on Basescan:
   ```bash
   npx hardhat verify --network base CONTRACT_ADDRESS
   ```

### Backend Deployment
- Deploy to your preferred cloud provider
- Use environment variables for all secrets
- Enable HTTPS and proper CORS settings
- Set up monitoring and logging
- Configure PIX webhook endpoints

### Frontend Deployment
- Build optimized production bundle:
  ```bash
  cd frontend
  npm run build
  ```
- Deploy to Vercel, Netlify, or similar platform
- Configure environment variables
- Set up custom domain

## 🔧 Configuration

### PIX Provider Integration
The system is designed to work with any PIX payment provider. You'll need to:

1. **Webhook Setup**: Configure your PIX provider to send webhooks to `/webhook/pix`
2. **Signature Verification**: Implement the signature verification for your provider
3. **Payload Mapping**: Adjust the payload processing in `PIXService.processWebhookPayload()`

### Network Configuration
- **Mainnet**: Use Base L2 mainnet for production
- **Testnet**: Use Base Sepolia for testing  
- **Local**: Use Hardhat network for development

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Metrics
- Total verified identities: `GET /verify/stats`
- User verification status: `GET /verify/status/:address`
- Payment status polling: `GET /verify/payment-status/:address`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please:
1. Check the [FAQ](docs/FAQ.md)
2. Review [troubleshooting guide](docs/TROUBLESHOOTING.md)  
3. Open an issue on GitHub
4. Join our Discord community

## ⚠️ Disclaimer

This software is provided as-is for educational and development purposes. When handling real PIX payments and personal data like CPF, ensure compliance with:
- Brazilian data protection laws (LGPD)
- Financial regulations (BACEN)
- Know Your Customer (KYC) requirements
- Anti-money laundering (AML) compliance

## 🗺️ Roadmap

- [ ] Multi-language support (Portuguese/English)
- [ ] Mobile app integration
- [ ] Additional identity verification methods
- [ ] Integration with other Brazilian payment systems
- [ ] Advanced analytics and reporting
- [ ] Batch processing for high volume

---

Built with ❤️ for the Brazilian Web3 community