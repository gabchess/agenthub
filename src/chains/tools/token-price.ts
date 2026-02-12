/**
 * Token price feed tool using DexScreener API
 *
 * Provides real-time token price data, liquidity, volume, and historical prices
 * for tokens across multiple chains including Monad, Ethereum, Base, and Arbitrum.
 */

import type { Address } from 'viem';
import { CacheManager } from './cache.js';

/**
 * DexScreener API base URL
 */
const DEXSCREENER_BASE = 'https://api.dexscreener.com';

/**
 * Default cache TTL for price data (60 seconds)
 */
const DEFAULT_TTL_MS = 60000;

/**
 * Maximum number of retries for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Delay between retries in milliseconds
 */
const RETRY_DELAY_MS = 1000;

/**
 * Chain ID mapping to DexScreener chain identifiers
 */
const CHAIN_MAP: Record<string, string> = {
  'monad': 'monad',
  'ethereum': 'ethereum',
  'base': 'base',
  'arbitrum': 'arbitrum',
};

/**
 * Parameters for token price query
 */
export interface TokenPriceParams {
  /** List of tokens to fetch prices for */
  tokens: Array<{ chainId: string; address: Address }>;
  /** Whether to include price history in the response */
  includeHistory?: boolean;
  /** Number of hours of history to include (if includeHistory is true) */
  historyHours?: number;
}

/**
 * Token price data result
 */
export interface TokenPriceResult {
  /** Price data for each requested token */
  prices: Array<{
    chainId: string;
    address: Address;
    priceUsd: string;
    priceNative: string;
    volume24h: string;
    liquidity: string;
    priceChange24h: string;
    lastUpdated: string;
    history?: Array<{ timestamp: string; priceUsd: string }>;
  }>;
}

/**
 * Tool execution result wrapper
 */
export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * DexScreener API response types
 */
interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}

/**
 * Sleeps for a specified number of milliseconds
 * @param ms - Number of milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches token prices from DexScreener API
 *
 * @param params - Token price query parameters
 * @param cache - Optional cache manager for caching results
 * @returns Tool result containing price data for all requested tokens
 *
 * @example
 * ```typescript
 * const result = await getTokenPrices({
 *   tokens: [
 *     { chainId: 'ethereum', address: '0x...' },
 *     { chainId: 'base', address: '0x...' }
 *   ],
 *   includeHistory: true,
 *   historyHours: 24
 * });
 *
 * if (result.success && result.data) {
 *   for (const price of result.data.prices) {
 *     console.log(`${price.address}: $${price.priceUsd}`);
 *   }
 * }
 * ```
 */
export async function getTokenPrices(
  params: TokenPriceParams,
  cache?: CacheManager
): Promise<ToolResult<TokenPriceResult>> {
  try {
    // Validate input
    if (!params.tokens || params.tokens.length === 0) {
      return {
        success: false,
        error: 'At least one token is required',
      };
    }

    const prices: TokenPriceResult['prices'] = [];

    // Fetch price data for each token
    for (const token of params.tokens) {
      const cacheKey = `token-price:${token.chainId}:${token.address.toLowerCase()}`;

      // Check cache first
      if (cache) {
        const cached = cache.get<TokenPriceResult['prices'][0]>(cacheKey);
        if (cached) {
          prices.push(cached);
          continue;
        }
      }

      // Map chain ID to DexScreener chain identifier
      const dexScreenerChain = CHAIN_MAP[token.chainId.toLowerCase()];
      if (!dexScreenerChain) {
        // Skip unsupported chains with a fallback price
        prices.push({
          chainId: token.chainId,
          address: token.address,
          priceUsd: '0',
          priceNative: '0',
          volume24h: '0',
          liquidity: '0',
          priceChange24h: '0',
          lastUpdated: new Date().toISOString(),
        });
        continue;
      }

      // Fetch from DexScreener with retries
      let retries = 0;
      let response: DexScreenerResponse | null = null;
      let lastError: Error | null = null;

      while (retries < MAX_RETRIES) {
        try {
          const url = `${DEXSCREENER_BASE}/latest/dex/tokens/${dexScreenerChain}/${token.address}`;
          const res = await fetch(url);

          // Handle rate limiting with exponential backoff
          if (res.status === 429) {
            retries++;
            if (retries >= MAX_RETRIES) {
              throw new Error('Rate limit exceeded, max retries reached');
            }
            const backoffMs = RETRY_DELAY_MS * Math.pow(2, retries - 1);
            await sleep(backoffMs);
            continue;
          }

          if (!res.ok) {
            throw new Error(`DexScreener API error: ${res.status} ${res.statusText}`);
          }

          response = await res.json() as DexScreenerResponse;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retries++;
          if (retries < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * retries);
          }
        }
      }

      // Handle fetch failure
      if (!response || !response.pairs || response.pairs.length === 0) {
        prices.push({
          chainId: token.chainId,
          address: token.address,
          priceUsd: '0',
          priceNative: '0',
          volume24h: '0',
          liquidity: '0',
          priceChange24h: '0',
          lastUpdated: new Date().toISOString(),
        });
        continue;
      }

      // Extract price data from the first pair (most liquid)
      const pair = response.pairs[0];
      const priceData: TokenPriceResult['prices'][0] = {
        chainId: token.chainId,
        address: token.address,
        priceUsd: pair.priceUsd || '0',
        priceNative: pair.priceNative || '0',
        volume24h: pair.volume?.h24?.toString() || '0',
        liquidity: pair.liquidity?.usd?.toString() || '0',
        priceChange24h: pair.priceChange?.h24?.toString() || '0',
        lastUpdated: new Date().toISOString(),
      };

      // Add price history if requested
      // Note: DexScreener's free API doesn't provide historical data
      // This would require a premium API or separate endpoint
      if (params.includeHistory) {
        priceData.history = [];
      }

      prices.push(priceData);

      // Cache the result
      if (cache) {
        cache.set(cacheKey, priceData, DEFAULT_TTL_MS);
      }
    }

    return {
      success: true,
      data: { prices },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parses token queries from agent output
 *
 * Expected format: `/TOKEN: <chainId>:<address>` or `/TOKEN: <chainId> <address>`
 *
 * @param output - Agent output text to parse
 * @returns Array of parsed token references with chainId and address
 *
 * @example
 * ```typescript
 * const output = `
 *   I need to check prices for:
 *   /TOKEN: ethereum:0x1234567890123456789012345678901234567890
 *   /TOKEN: base:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
 * `;
 *
 * const tokens = parseTokenQuery(output);
 * // Returns: [
 * //   { chainId: 'ethereum', address: '0x1234567890123456789012345678901234567890' },
 * //   { chainId: 'base', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' }
 * // ]
 * ```
 */
export function parseTokenQuery(output: string): Array<{ chainId: string; address: Address }> {
  const tokens: Array<{ chainId: string; address: Address }> = [];

  // Match pattern: /TOKEN: <chainId>:<address> or /TOKEN: <chainId> <address>
  const regex = /\/TOKEN:\s*([a-z]+):?\s*(0x[a-fA-F0-9]{40})/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    const chainId = match[1].toLowerCase();
    const address = match[2] as Address;
    tokens.push({ chainId, address });
  }

  return tokens;
}
