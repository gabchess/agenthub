/**
 * Balance collector — polls wallet balances from Monad.
 *
 * Uses getWalletBalances() from existing tools with getGlobalCache().
 */

import { getWalletBalances } from '../../chains/tools/wallet-balance.js';
import { getGlobalCache } from '../../chains/tools/cache.js';
import { MonadClient } from '../../chains/monad.js';
import { insertBalanceSnapshot } from '../db-pipeline.js';
import { BaseCollector } from './base-collector.js';
import type { Address } from 'viem';
import type { CircuitBreakerConfig } from '../types.js';

export class BalanceCollector extends BaseCollector {
  private addresses: Address[];

  constructor(
    pollIntervalMs: number,
    addresses: string[],
    cbConfig: CircuitBreakerConfig,
  ) {
    super('balances', pollIntervalMs, cbConfig);
    this.addresses = addresses as Address[];
  }

  async collect(): Promise<number> {
    if (this.addresses.length === 0) return 0;

    const cache = getGlobalCache();
    const result = await getWalletBalances(
      { addresses: this.addresses, chain: 'monad-testnet' },
      cache,
    );

    if (!result.ok || !result.result) return 0;

    let ingested = 0;

    for (const balance of result.result.balances) {
      if (balance.balance.startsWith('Error:')) continue;

      insertBalanceSnapshot({
        address: balance.address,
        balance_wei: balance.balanceWei,
        balance_formatted: balance.balance,
        block_number: parseInt(balance.blockNumber, 10),
        chain: 'monad-testnet',
      });
      ingested++;

      if (this.broadcaster) {
        this.broadcaster.broadcast('balance', {
          address: balance.address,
          balanceWei: balance.balanceWei,
          balanceFormatted: balance.balance,
          blockNumber: balance.blockNumber,
        });
      }
    }

    return ingested;
  }
}
