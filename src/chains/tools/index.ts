/**
 * Tool Registry
 *
 * Central registry for all blockchain tools available to agents.
 * Provides a unified interface for invoking tools and handles routing
 * to the appropriate implementation based on tool name.
 *
 * This registry pattern allows for:
 * - Type-safe tool invocation
 * - Centralized error handling
 * - Easy addition of new tools
 * - Consistent result format across all tools
 */

import type { ToolResult } from '../types.js';
import { getGlobalCache } from './cache.js';

// Import tool implementations
import { getWalletBalances } from './wallet-balance.js';
import { getTokenPrices } from './token-price.js';
import { readContract } from './contract-read.js';
import { x402Pay } from './x402-pay.js';

/**
 * Available tool names that can be invoked through the registry.
 * Each tool name corresponds to a specific blockchain operation.
 */
export type ToolName = 'wallet_balance' | 'token_price' | 'contract_read' | 'x402_pay';

/**
 * Tool invocation request structure.
 * Contains the tool name, arguments, and optional session key for caching.
 */
export interface ToolInvocation {
  /** The name of the tool to invoke */
  tool: ToolName;
  /** Arguments to pass to the tool (type depends on the tool) */
  args: any;
  /** Optional session key for cache namespacing */
  sessionKey?: string;
}

/**
 * Invokes a blockchain tool by name with the provided arguments.
 *
 * This function acts as a router, dispatching tool invocations to the
 * appropriate implementation based on the tool name. It handles errors
 * consistently and returns results in a standardized format.
 *
 * @param invocation - The tool invocation request
 * @returns A promise resolving to a ToolResult with the operation outcome
 *
 * @example
 * ```typescript
 * const result = await invokeChainTool({
 *   tool: 'wallet_balance',
 *   args: { addresses: ['0x123...'], chain: 'monad-testnet' }
 * });
 *
 * if (result.ok) {
 *   console.log('Balances:', result.result);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function invokeChainTool(
  invocation: ToolInvocation
): Promise<ToolResult> {
  const cache = getGlobalCache();

  try {
    // Route to the appropriate tool implementation
    switch (invocation.tool) {
      case 'wallet_balance': {
        return await getWalletBalances(invocation.args, cache);
      }

      case 'token_price': {
        const result = await getTokenPrices(invocation.args, cache);
        // Convert token-price.ts result format to standard ToolResult
        if (!result.success) {
          return {
            ok: false,
            error: {
              code: 'TOKEN_PRICE_ERROR',
              message: result.error || 'Unknown error',
            },
            timestamp: new Date().toISOString(),
          };
        }
        return {
          ok: true,
          result: result.data,
          timestamp: new Date().toISOString(),
        };
      }

      case 'contract_read': {
        const result = await readContract(invocation.args, cache);
        // Convert contract-read.ts result format to standard ToolResult
        if (!result.success) {
          return {
            ok: false,
            error: {
              code: 'CONTRACT_READ_ERROR',
              message: result.error || 'Unknown error',
            },
            timestamp: new Date().toISOString(),
          };
        }
        return {
          ok: true,
          result: result.data,
          timestamp: new Date().toISOString(),
        };
      }

      case 'x402_pay': {
        return await x402Pay(invocation.args, cache);
      }

      default: {
        // Handle unknown tool names
        return {
          ok: false,
          error: {
            code: 'UNKNOWN_TOOL',
            message: `Unknown tool: ${invocation.tool}`,
            details: { tool: invocation.tool },
          },
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    // Catch any unexpected errors and return them in a standardized format
    return {
      ok: false,
      error: {
        code: 'INVOCATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error },
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Re-export all tools and utilities for convenient importing.
 * This allows consumers to import everything they need from a single module:
 *
 * ```typescript
 * import { invokeChainTool, getGlobalCache, COMMON_ABIS } from './chains/tools';
 * ```
 */

// Re-export tool implementations (excluding ToolResult to avoid conflicts)
export {
  getWalletBalances,
  parseBalanceOutput,
  type WalletBalanceParams,
  type WalletBalanceResult,
} from './wallet-balance.js';
export {
  getTokenPrices,
  parseTokenQuery,
  type TokenPriceParams,
  type TokenPriceResult,
} from './token-price.js';
export {
  readContract,
  parseContractReadQuery,
  type ContractReadParams,
  type ContractReadResult,
} from './contract-read.js';
export {
  x402Pay,
  parseX402PayOutput,
  type X402PayParams,
  type X402PayResult,
} from './x402-pay.js';

// Re-export utilities
export * from './cache.js';
export * from './abis.js';
