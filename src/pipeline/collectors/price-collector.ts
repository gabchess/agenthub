/**
 * Price collector — polls token prices from DexScreener.
 *
 * Uses getTokenPrices() from existing tools with getGlobalCache().
 */

import { getTokenPrices } from '../../chains/tools/token-price.js';
import { getGlobalCache } from '../../chains/tools/cache.js';
import { insertPriceSnapshot } from '../db-pipeline.js';
import { BaseCollector } from './base-collector.js';
import type { Address } from 'viem';
import type { CircuitBreakerConfig } from '../types.js';

export class PriceCollector extends BaseCollector {
  private tokens: Array<{ chainId: string; address: Address }>;

  constructor(
    pollIntervalMs: number,
    tokens: Array<{ chainId: string; address: string }>,
    cbConfig: CircuitBreakerConfig,
  ) {
    super('prices', pollIntervalMs, cbConfig);
    this.tokens = tokens.map((t) => ({
      chainId: t.chainId,
      address: t.address as Address,
    }));
  }

  async collect(): Promise<number> {
    if (this.tokens.length === 0) return 0;

    const cache = getGlobalCache();
    const result = await getTokenPrices({ tokens: this.tokens }, cache);

    if (!result.success || !result.data) return 0;

    let ingested = 0;

    for (const price of result.data.prices) {
      insertPriceSnapshot({
        chain_id: price.chainId,
        token_address: price.address,
        price_usd: price.priceUsd,
        price_native: price.priceNative,
        volume_24h: price.volume24h,
        liquidity_usd: price.liquidity,
        price_change_24h: price.priceChange24h,
        source: 'dexscreener',
      });
      ingested++;

      if (this.broadcaster) {
        this.broadcaster.broadcast('price', {
          chainId: price.chainId,
          tokenAddress: price.address,
          priceUsd: price.priceUsd,
          priceNative: price.priceNative,
          volume24h: price.volume24h,
          liquidityUsd: price.liquidity,
          priceChange24h: price.priceChange24h,
        });
      }
    }

    return ingested;
  }
}
