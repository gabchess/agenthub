/**
 * Wallet Balance Checker Tool
 *
 * Provides functionality to check wallet balances on Monad blockchain.
 * Supports parallel balance queries with caching for performance optimization.
 */

import { MonadClient } from '../monad.js';
import { formatEther } from 'viem';
import type { Address } from 'viem';
import { CacheManager } from './cache.js';

/**
 * Parameters for wallet balance query
 */
export interface WalletBalanceParams {
  /** Array of wallet addresses to check */
  addresses: Address[];
  /** Target blockchain network (defaults to monad-testnet) */
  chain?: 'monad-testnet' | 'monad-mainnet';
}

/**
 * Result for a single wallet balance query
 */
export interface WalletBalanceResult {
  /** Balance information for each queried address */
  balances: Array<{
    /** Wallet address */
    address: Address;
    /** Human-readable balance (e.g., "1.5 MON") */
    balance: string;
    /** Raw balance in wei as string */
    balanceWei: string;
    /** Block number at which balance was fetched */
    blockNumber: string;
  }>;
}

/**
 * Generic tool result wrapper with error handling and metadata
 */
export interface ToolResult<T = any> {
  /** Whether the operation succeeded */
  ok: boolean;
  /** Result data if successful */
  result?: T;
  /** Error information if failed */
  error?: {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: any;
  };
  /** Whether the result came from cache */
  cached?: boolean;
  /** ISO timestamp of when the operation completed */
  timestamp: string;
}

/**
 * Fetches wallet balances for multiple addresses in parallel.
 *
 * This function queries the Monad blockchain to get the native token (MON)
 * balance for one or more wallet addresses. It uses parallel execution
 * (Promise.all) for optimal performance when checking multiple wallets.
 *
 * Features:
 * - Parallel balance fetching for multiple addresses
 * - Automatic caching with configurable TTL (default 10 seconds)
 * - Graceful error handling per address (failures don't block other queries)
 * - Returns both human-readable and raw wei values
 * - Includes block number for balance verification
 *
 * @param params - Query parameters including addresses and optional chain
 * @param cache - Optional cache manager (if not provided, caching is disabled)
 * @returns Promise resolving to ToolResult with balance data or error
 *
 * @example
 * ```typescript
 * const result = await getWalletBalances({
 *   addresses: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
 *   chain: 'monad-testnet'
 * });
 *
 * if (result.ok) {
 *   console.log(result.result.balances[0].balance); // "1.5 MON"
 * }
 * ```
 */
export async function getWalletBalances(
  params: WalletBalanceParams,
  cache?: CacheManager
): Promise<ToolResult<WalletBalanceResult>> {
  const timestamp = new Date().toISOString();

  // Validate input: at least one address is required
  if (!params.addresses || params.addresses.length === 0) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'At least one address is required',
        details: { addresses: params.addresses }
      },
      timestamp
    };
  }

  // Default to testnet if chain not specified
  const chain = params.chain || 'monad-testnet';

  // Generate cache key based on chain and sorted addresses
  const cacheKey = `wallet-balance:${chain}:${params.addresses.sort().join(',')}`;

  // Check cache first (10 second TTL for balance data)
  if (cache) {
    const cached = cache.get<WalletBalanceResult>(cacheKey);
    if (cached) {
      return {
        ok: true,
        result: cached,
        cached: true,
        timestamp
      };
    }
  }

  try {
    // Create Monad client instance (read-only, no private key needed)
    const client = new MonadClient();

    // Get current block number for reference
    const blockNumber = await client.getBlockNumber();
    const blockNumberStr = blockNumber.toString();

    // Fetch all balances in parallel for optimal performance
    const balancePromises = params.addresses.map(async (address) => {
      try {
        // Query balance from blockchain
        const balanceWei = await client.getBalance(address);

        // Format balance for human readability
        const balanceFormatted = formatEther(balanceWei);

        return {
          address,
          balance: `${balanceFormatted} MON`,
          balanceWei: balanceWei.toString(),
          blockNumber: blockNumberStr
        };
      } catch (error) {
        // Handle per-address errors gracefully
        // Return error message in balance field so user knows what failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          address,
          balance: `Error: ${errorMessage}`,
          balanceWei: '0',
          blockNumber: blockNumberStr
        };
      }
    });

    // Wait for all balance queries to complete
    const balances = await Promise.all(balancePromises);

    const result: WalletBalanceResult = {
      balances
    };

    // Cache the result for 10 seconds to reduce RPC load
    if (cache) {
      cache.set(cacheKey, result, 10000); // 10 second TTL
    }

    return {
      ok: true,
      result,
      cached: false,
      timestamp
    };

  } catch (error) {
    // Handle top-level errors (e.g., RPC connection failures)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? { stack: error.stack } : { error };

    return {
      ok: false,
      error: {
        code: 'FETCH_FAILED',
        message: `Failed to fetch wallet balances: ${errorMessage}`,
        details: errorDetails
      },
      timestamp
    };
  }
}

/**
 * Parses agent output to extract wallet addresses.
 *
 * This function scans text output from an AI agent and extracts Ethereum-style
 * wallet addresses. It looks for patterns like "BALANCE: 0x..." or "ADDRESS: 0x..."
 * which are common in agent outputs when discussing wallet balances.
 *
 * The regex pattern matches:
 * - "BALANCE:" or "ADDRESS:" prefix (case-insensitive)
 * - Optional whitespace
 * - Ethereum address (0x followed by 40 hex characters)
 *
 * @param output - Text output from an AI agent
 * @returns Array of extracted Ethereum addresses (may be empty if none found)
 *
 * @example
 * ```typescript
 * const output = "Check BALANCE: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
 * const addresses = parseBalanceOutput(output);
 * // Returns: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']
 * ```
 */
export function parseBalanceOutput(output: string): Address[] {
  // Match patterns like "BALANCE: 0x..." or "ADDRESS: 0x..."
  const addressRegex = /(?:BALANCE|ADDRESS):\s*(0x[a-fA-F0-9]{40})/gi;

  const matches: Address[] = [];
  let match;

  // Extract all matching addresses from the output
  while ((match = addressRegex.exec(output)) !== null) {
    // match[1] contains the captured address (0x...)
    matches.push(match[1] as Address);
  }

  // Remove duplicates by converting to Set and back to array
  return Array.from(new Set(matches));
}
