import { ethers } from 'ethers';
import { config } from '../../config';

// ABI (Application Binary Interface) mínima para a função `mint`.
// Apenas a função que nos interessa é necessária.
const sbtContractAbi = [
  "function mint(address to) public returns (uint256)",
];

// Cria um provedor para se conectar ao nó RPC da Base.
const provider = new ethers.providers.JsonRpcProvider(config.BASE_RPC_URL);

// Cria uma instância da carteira "minter" a partir da chave privada.
const minterWallet = new ethers.Wallet(config.MINTER_PRIVATE_KEY, provider);

// Cria uma instância do contrato SBT.
const sbtContract = new ethers.Contract(config.SBT_CONTRACT_ADDRESS, sbtContractAbi, minterWallet);

/**
 * Chama a função `mint` do smart contract para emitir um SBT.
 * @param recipientAddress O endereço da carteira que receberá o SBT.
 * @returns O hash da transação.
 * @throws Lança um erro se a chamada à blockchain falhar.
 */
export async function mintSbt(recipientAddress: string): Promise<string> {
  try {
    console.log(`Iniciando mint do SBT para o endereço: ${recipientAddress}`);

    // Estima o gás necessário para a transação
    const gasLimit = await sbtContract.estimateGas.mint(recipientAddress);

    // Chama a função `mint` do contrato
    const tx = await sbtContract.mint(recipientAddress, {
      gasLimit: gasLimit,
    });

    console.log(`Transação de mint enviada. Hash: ${tx.hash}`);

    // Opcional: esperar a transação ser minerada. Para o MVP, apenas o hash é suficiente.
    // await tx.wait();
    // console.log(`Transação de mint confirmada para o endereço: ${recipientAddress}`);

    return tx.hash;
  } catch (error) {
    console.error('❌ Erro ao tentar fazer o mint do SBT:', error);
    // Lança o erro para ser tratado pela camada de serviço (ex: para uma fila de retentativas)
    throw new Error('Falha na comunicação com a blockchain ao tentar emitir o SBT.');
  }
}
