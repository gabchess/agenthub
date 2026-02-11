/**
 * Monad blockchain integration layer
 *
 * Provides:
 * - RPC connection to Monad testnet
 * - Wallet creation and management
 * - Transaction submission with parallel execution support
 * - Gas estimation optimized for Monad
 * - Local nonce tracking for high-throughput agents
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type PrivateKeyAccount,
  defineChain,
  formatEther,
  formatGwei,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import type {
  ChainConfig,
  BlockchainClient,
  Transaction,
  TxReceipt,
  TxBatch,
  GasEstimate,
} from './types.js';

/**
 * Monad testnet chain definition
 */
export const monadTestnet = defineChain({
  id: 41454, // Monad testnet chain ID
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.monad.xyz/v1'],
    },
    public: {
      http: ['https://testnet.monad.xyz/v1'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.testnet.monad.xyz',
    },
  },
  testnet: true,
});

/**
 * Monad mainnet chain definition (for future use)
 */
export const monadMainnet = defineChain({
  id: 143, // Monad mainnet chain ID (placeholder)
  name: 'Monad',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.monad.xyz/v1'], // Placeholder
    },
    public: {
      http: ['https://mainnet.monad.xyz/v1'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.monad.xyz',
    },
  },
  testnet: false,
});

/**
 * Local nonce tracker for parallel transaction submission
 * Critical for Monad's 10,000 TPS - don't wait for chain confirmation
 */
class NonceManager {
  private nonces: Map<Address, number> = new Map();

  async getNextNonce(address: Address, publicClient: any): Promise<number> {
    // Check local cache first
    if (this.nonces.has(address)) {
      const nonce = this.nonces.get(address)!;
      this.nonces.set(address, nonce + 1);
      return nonce;
    }

    // Fallback to chain
    const chainNonce = await publicClient.getTransactionCount({
      address,
      blockTag: 'pending',
    });
    this.nonces.set(address, chainNonce + 1);
    return chainNonce;
  }

  async batchGetNonces(
    address: Address,
    count: number,
    publicClient: any
  ): Promise<number[]> {
    const baseNonce = await this.getNextNonce(address, publicClient);
    const nonces = Array.from({ length: count }, (_, i) => baseNonce + i);

    // Update cache to skip all used nonces
    this.nonces.set(address, baseNonce + count);

    return nonces;
  }

  reset(address: Address) {
    this.nonces.delete(address);
  }
}

/**
 * Monad blockchain client
 */
export class MonadClient implements BlockchainClient {
  public publicClient;
  public walletClient;
  private account?: PrivateKeyAccount;
  private nonceManager: NonceManager;

  constructor(privateKey?: `0x${string}`) {
    // Create public client for reading
    this.publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });

    // Create wallet client if private key provided
    if (privateKey) {
      this.account = privateKeyToAccount(privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: monadTestnet,
        transport: http(),
      });
    }

    this.nonceManager = new NonceManager();
  }

  /**
   * Create a new random wallet
   */
  static createWallet(): PrivateKeyAccount {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const privateKey = `0x${Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}` as `0x${string}`;
    return privateKeyToAccount(privateKey);
  }

  /**
   * Import wallet from private key
   */
  static importWallet(privateKey: `0x${string}`): PrivateKeyAccount {
    return privateKeyToAccount(privateKey);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * Get current gas price (Monad uses EIP-1559)
   */
  async getGasPrice(): Promise<bigint> {
    const block = await this.publicClient.getBlock();
    return block.baseFeePerGas || 1000000000n; // 1 gwei fallback
  }

  /**
   * Estimate gas for a transaction
   * Optimized for Monad's parallel execution
   */
  async estimateGas(tx: Transaction): Promise<GasEstimate> {
    if (!this.account) {
      throw new Error('Wallet not initialized');
    }

    // Estimate gas limit
    const gasLimit = await this.publicClient.estimateGas({
      account: this.account,
      to: tx.to,
      value: tx.value || 0n,
      data: tx.data,
    });

    // Get current gas price
    const block = await this.publicClient.getBlock();
    const baseFeePerGas = block.baseFeePerGas || 1000000000n;

    // Calculate EIP-1559 fees (Monad uses EIP-1559)
    const maxPriorityFeePerGas = 1000000000n; // 1 gwei priority
    const maxFeePerGas = baseFeePerGas * 2n + maxPriorityFeePerGas;

    const estimatedCostWei = gasLimit * maxFeePerGas;

    return {
      gasLimit: gasLimit * 12n / 10n, // Add 20% buffer
      gasPrice: baseFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedCostWei,
    };
  }

  /**
   * Submit a single transaction
   */
  async submitTransaction(tx: Transaction): Promise<Hash> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet client not initialized');
    }

    // Get nonce if not provided
    const nonce =
      tx.nonce !== undefined
        ? tx.nonce
        : await this.nonceManager.getNextNonce(
            this.account.address,
            this.publicClient
          );

    // Estimate gas if not provided
    let gasEstimate: GasEstimate;
    if (!tx.gas || !tx.maxFeePerGas) {
      gasEstimate = await this.estimateGas(tx);
    } else {
      gasEstimate = {
        gasLimit: tx.gas,
        gasPrice: 0n,
        maxFeePerGas: tx.maxFeePerGas!,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas || 1000000000n,
        estimatedCostWei: 0n,
      };
    }

    // Submit transaction
    const hash = await this.walletClient.sendTransaction({
      account: this.account,
      to: tx.to,
      value: tx.value || 0n,
      data: tx.data,
      nonce,
      gas: gasEstimate.gasLimit,
      maxFeePerGas: gasEstimate.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
    });

    return hash;
  }

  /**
   * Submit multiple transactions in parallel
   *
   * This is THE KEY OPTIMIZATION for Monad:
   * - Uses Promise.all() for concurrent submission
   * - Local nonce tracking prevents waiting for chain
   * - Monad's parallel execution detects conflicts at slot level
   * - Only conflicting txs are re-executed, others proceed
   *
   * Example: 100 agent txs in parallel = 33-36% faster than sequential
   */
  async submitParallelTransactions(batch: TxBatch): Promise<Hash[]> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet client not initialized');
    }

    // Get sequential nonces for all transactions
    const nonces = await this.nonceManager.batchGetNonces(
      this.account.address,
      batch.transactions.length,
      this.publicClient
    );

    // Prepare all transactions with sequential nonces
    const preparedTxs = batch.transactions.map((tx, i) => ({
      ...tx,
      nonce: batch.baseNonce !== undefined ? batch.baseNonce + i : nonces[i],
    }));

    // Submit all in parallel using Promise.all()
    const txPromises = preparedTxs.map((tx) => this.submitTransaction(tx));

    const txHashes = await Promise.all(txPromises);

    return txHashes;
  }

  /**
   * Wait for transaction receipt
   * Monad finality: 800ms (MonadBFT consensus)
   */
  async waitForReceipt(txHash: Hash): Promise<TxReceipt> {
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    return {
      hash: txHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 'success' ? 'success' : 'reverted',
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
    };
  }

  /**
   * Get account balance
   */
  async getBalance(address?: Address): Promise<bigint> {
    const addr = address || this.account?.address;
    if (!addr) {
      throw new Error('No address provided and no wallet initialized');
    }

    return await this.publicClient.getBalance({ address: addr });
  }

  /**
   * Format balance for display
   */
  formatBalance(balance: bigint): string {
    return `${formatEther(balance)} MON`;
  }

  /**
   * Get wallet address
   */
  getAddress(): Address | undefined {
    return this.account?.address;
  }
}

/**
 * Utility: Create Monad client from environment variable
 */
export function createMonadClientFromEnv(): MonadClient {
  const privateKey = process.env.MONAD_PRIVATE_KEY as `0x${string}` | undefined;
  return new MonadClient(privateKey);
}

/**
 * Utility: Check Monad network health
 */
export async function checkMonadHealth(): Promise<{
  connected: boolean;
  blockNumber: bigint;
  gasPrice: bigint;
  blockTime: number;
}> {
  const client = new MonadClient();

  try {
    const [blockNumber, block] = await Promise.all([
      client.getBlockNumber(),
      client.publicClient.getBlock(),
    ]);

    const gasPrice = block.baseFeePerGas || 0n;

    // Estimate block time (should be ~400ms on Monad)
    const prevBlock = await client.publicClient.getBlock({
      blockNumber: blockNumber - 1n,
    });
    const blockTime = Number(block.timestamp - prevBlock.timestamp);

    return {
      connected: true,
      blockNumber,
      gasPrice,
      blockTime,
    };
  } catch (error) {
    return {
      connected: false,
      blockNumber: 0n,
      gasPrice: 0n,
      blockTime: 0,
    };
  }
}
