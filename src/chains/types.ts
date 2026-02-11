/**
 * Blockchain-related type definitions for AgentHub
 */

import type { Address, Hash, PublicClient, WalletClient, Account } from 'viem';

/**
 * Supported blockchain networks
 */
export type ChainId = 'monad-testnet' | 'monad-mainnet' | 'ethereum' | 'base';

/**
 * Network configuration
 */
export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Agent wallet abstraction
 */
export interface AgentWallet {
  address: Address;
  sign: (message: string) => Promise<Hash>;
  signTransaction: (tx: Transaction) => Promise<Hash>;
}

/**
 * Transaction object
 */
export interface Transaction {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

/**
 * Transaction receipt
 */
export interface TxReceipt {
  hash: Hash;
  blockNumber: bigint;
  status: 'success' | 'reverted';
  gasUsed: bigint;
  effectiveGasPrice: bigint;
}

/**
 * Parallel transaction batch
 */
export interface TxBatch {
  transactions: Transaction[];
  baseNonce: number;
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCostWei: bigint;
}

/**
 * On-chain verification result
 */
export interface VerificationResult {
  success: boolean;
  txHash: Hash;
  blockNumber: bigint;
  expectedState?: any;
  actualState?: any;
  error?: string;
}

/**
 * Blockchain client interface
 */
export interface BlockchainClient {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  getBlockNumber: () => Promise<bigint>;
  getGasPrice: () => Promise<bigint>;
  estimateGas: (tx: Transaction) => Promise<GasEstimate>;
  submitTransaction: (tx: Transaction) => Promise<Hash>;
  submitParallelTransactions: (batch: TxBatch) => Promise<Hash[]>;
  waitForReceipt: (txHash: Hash) => Promise<TxReceipt>;
}
