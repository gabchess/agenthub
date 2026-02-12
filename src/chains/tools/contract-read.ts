/**
 * Contract read tool for querying smart contract state.
 *
 * Features:
 * - Reads contract state using eth_call (no gas cost)
 * - Auto-detects common interfaces (ERC20, ERC721)
 * - Caches results for 30 seconds to reduce RPC calls
 * - Supports both ABI-based and raw data calls
 * - Decodes results when ABI is provided
 */

import type { Address } from 'viem';
import { encodeFunctionData, decodeFunctionResult } from 'viem';
import { MonadClient } from '../monad.js';
import { CacheManager } from './cache.js';
import { COMMON_ABIS } from './abis.js';

/**
 * Default cache TTL for contract reads (30 seconds)
 */
const DEFAULT_TTL_MS = 30000;

/**
 * Parameters for reading from a contract
 */
export interface ContractReadParams {
  /** Chain to read from (defaults to monad-testnet) */
  chain?: 'monad-testnet' | 'monad-mainnet';
  /** Contract address to read from */
  contractAddress: Address;
  /** ABI definition (optional, auto-detected for common interfaces) */
  abi?: any[];
  /** Method name to call (e.g., 'balanceOf') */
  method?: string;
  /** Arguments to pass to the method */
  args?: any[];
  /** Raw calldata (alternative to method + args) */
  data?: `0x${string}`;
}

/**
 * Result of a contract read operation
 */
export interface ContractReadResult {
  /** Decoded value (if ABI provided) */
  value: any;
  /** Human-readable decoded result */
  decoded?: any;
  /** Block number at which the read was performed */
  blockNumber: string;
  /** Raw hex-encoded return data */
  raw: `0x${string}`;
}

/**
 * Generic tool result wrapper
 */
export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Detects if a method belongs to a common interface and returns its ABI.
 *
 * @param method - The method name to check
 * @returns The ABI array if a common interface is detected, null otherwise
 */
function detectCommonInterface(method: string): readonly any[] | null {
  // ERC20 methods
  if (
    ['balanceOf', 'totalSupply', 'decimals', 'symbol', 'name', 'allowance'].includes(
      method
    )
  ) {
    return COMMON_ABIS.ERC20;
  }

  // ERC721 methods
  if (['ownerOf', 'tokenURI'].includes(method)) {
    return COMMON_ABIS.ERC721;
  }

  return null;
}

/**
 * Reads data from a smart contract.
 *
 * This function performs a read-only call to a smart contract (eth_call).
 * It supports both high-level ABI-based calls and low-level raw data calls.
 *
 * Features:
 * - Automatic ABI detection for common interfaces (ERC20, ERC721)
 * - Result caching with configurable TTL
 * - Automatic result decoding when ABI is available
 * - Works with any contract on Monad testnet or mainnet
 *
 * @param params - Parameters for the contract read
 * @param cache - Optional cache manager (uses default TTL if not provided)
 * @returns A result object containing the decoded value and raw data
 *
 * @example
 * // Read ERC20 token balance (auto-detected ABI)
 * const result = await readContract({
 *   contractAddress: '0x...',
 *   method: 'balanceOf',
 *   args: ['0xUserAddress...']
 * });
 *
 * @example
 * // Read with custom ABI
 * const result = await readContract({
 *   contractAddress: '0x...',
 *   abi: myContractABI,
 *   method: 'getPrice',
 *   args: []
 * });
 *
 * @example
 * // Raw data call
 * const result = await readContract({
 *   contractAddress: '0x...',
 *   data: '0x...'
 * });
 */
export async function readContract(
  params: ContractReadParams,
  cache?: CacheManager
): Promise<ToolResult<ContractReadResult>> {
  try {
    // Validate required parameters
    if (!params.contractAddress) {
      return {
        success: false,
        error: 'Contract address is required',
      };
    }

    // Check cache if available
    if (cache) {
      const chain = params.chain || 'monad-testnet';
      const cacheKey = `contract-read:${chain}:${params.contractAddress}:${params.method || 'raw'}:${JSON.stringify(params.args || [])}`;
      const cached = cache.get<ContractReadResult>(cacheKey);

      if (cached) {
        return {
          success: true,
          data: cached,
        };
      }
    }

    // Determine ABI to use
    let abi: readonly any[] | any[] | undefined = params.abi;
    if (params.method && !abi) {
      const detectedAbi = detectCommonInterface(params.method);
      if (!detectedAbi) {
        return {
          success: false,
          error: `No ABI provided and method '${params.method}' is not a recognized standard interface method`,
        };
      }
      abi = detectedAbi;
    }

    // Encode function call
    let calldata: `0x${string}`;
    if (params.data) {
      // Use raw data if provided
      calldata = params.data;
    } else if (params.method && abi) {
      // Encode using ABI
      try {
        calldata = encodeFunctionData({
          abi,
          functionName: params.method,
          args: params.args || [],
        });
      } catch (error) {
        return {
          success: false,
          error: `Failed to encode function call: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    } else {
      return {
        success: false,
        error: 'Either data or (method + abi) must be provided',
      };
    }

    // Create client and execute call
    const client = new MonadClient();
    let result: `0x${string}`;
    let blockNumber: bigint;

    try {
      const [callResult, currentBlock] = await Promise.all([
        client.publicClient.call({
          to: params.contractAddress,
          data: calldata,
        }),
        client.getBlockNumber(),
      ]);

      result = callResult.data || '0x';
      blockNumber = currentBlock;
    } catch (error) {
      return {
        success: false,
        error: `Contract call failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Decode result if ABI available
    let decodedValue: any = result;
    let decoded: any = undefined;

    if (params.method && abi) {
      try {
        decodedValue = decodeFunctionResult({
          abi,
          functionName: params.method,
          data: result,
        });

        // Create human-readable representation
        if (typeof decodedValue === 'bigint') {
          decoded = {
            type: 'bigint',
            value: decodedValue.toString(),
            hex: result,
          };
        } else if (typeof decodedValue === 'string') {
          decoded = {
            type: 'string',
            value: decodedValue,
          };
        } else if (typeof decodedValue === 'boolean') {
          decoded = {
            type: 'boolean',
            value: decodedValue,
          };
        } else if (Array.isArray(decodedValue)) {
          decoded = {
            type: 'array',
            value: decodedValue,
          };
        } else {
          decoded = decodedValue;
        }
      } catch (error) {
        // Decoding failed, but we still have raw data
        decoded = {
          error: `Failed to decode: ${error instanceof Error ? error.message : String(error)}`,
          raw: result,
        };
      }
    }

    const contractReadResult: ContractReadResult = {
      value: decodedValue,
      decoded,
      blockNumber: blockNumber.toString(),
      raw: result,
    };

    // Cache result
    if (cache) {
      const chain = params.chain || 'monad-testnet';
      const cacheKey = `contract-read:${chain}:${params.contractAddress}:${params.method || 'raw'}:${JSON.stringify(params.args || [])}`;
      cache.set(cacheKey, contractReadResult, DEFAULT_TTL_MS);
    }

    return {
      success: true,
      data: contractReadResult,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parses agent output to extract contract read parameters.
 *
 * This function looks for specially formatted markers in agent output:
 * - CONTRACT: 0x... - The contract address
 * - METHOD: methodName - The method to call
 * - ARGS: [arg1, arg2, ...] - JSON array of arguments
 *
 * @param output - The agent's output text
 * @returns Partial contract read parameters extracted from the output
 *
 * @example
 * const output = `
 *   I need to read the balance.
 *   CONTRACT: 0x1234567890123456789012345678901234567890
 *   METHOD: balanceOf
 *   ARGS: ["0xUserAddress..."]
 * `;
 * const params = parseContractReadQuery(output);
 * // { contractAddress: '0x1234...', method: 'balanceOf', args: ['0xUser...'] }
 */
export function parseContractReadQuery(
  output: string
): Partial<ContractReadParams> {
  const params: Partial<ContractReadParams> = {};

  try {
    // Extract contract address
    const contractMatch = output.match(/CONTRACT:\s*(0x[a-fA-F0-9]{40})/);
    if (contractMatch) {
      params.contractAddress = contractMatch[1] as Address;
    }

    // Extract method name
    const methodMatch = output.match(/METHOD:\s*(\w+)/);
    if (methodMatch) {
      params.method = methodMatch[1];
    }

    // Extract arguments
    const argsMatch = output.match(/ARGS:\s*(\[[\s\S]*?\])/);
    if (argsMatch) {
      try {
        params.args = JSON.parse(argsMatch[1]);
      } catch (error) {
        // Invalid JSON, skip args
      }
    }
  } catch (error) {
    // If parsing fails, return whatever we managed to extract
  }

  return params;
}
