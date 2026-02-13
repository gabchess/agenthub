/**
 * Contract collector — polls smart contract reads from Monad.
 *
 * Uses readContract() from existing tools with getGlobalCache().
 */

import { readContract } from '../../chains/tools/contract-read.js';
import { getGlobalCache } from '../../chains/tools/cache.js';
import { MonadClient } from '../../chains/monad.js';
import { insertContractEvent } from '../db-pipeline.js';
import { BaseCollector } from './base-collector.js';
import type { Address } from 'viem';
import type { CircuitBreakerConfig } from '../types.js';

interface ContractTarget {
  contractAddress: Address;
  method: string;
  args: unknown[];
}

export class ContractCollector extends BaseCollector {
  private targets: ContractTarget[];

  constructor(
    pollIntervalMs: number,
    targets: Array<{ contractAddress: string; method: string; args: unknown[] }>,
    cbConfig: CircuitBreakerConfig,
  ) {
    super('contracts', pollIntervalMs, cbConfig);
    this.targets = targets.map((t) => ({
      contractAddress: t.contractAddress as Address,
      method: t.method,
      args: t.args,
    }));
  }

  async collect(): Promise<number> {
    if (this.targets.length === 0) return 0;

    const cache = getGlobalCache();
    const client = new MonadClient();
    let blockNumber: number;
    try {
      blockNumber = Number(await client.getBlockNumber());
    } catch {
      blockNumber = 0;
    }

    let ingested = 0;

    for (const target of this.targets) {
      try {
        const result = await readContract(
          {
            contractAddress: target.contractAddress,
            method: target.method,
            args: target.args as any[],
            chain: 'monad-mainnet',
          },
          cache,
        );

        const resultRaw = result.success && result.data ? result.data.raw : null;
        const resultDecoded = result.success && result.data?.decoded
          ? JSON.stringify(result.data.decoded)
          : null;

        insertContractEvent({
          chain: 'monad-mainnet',
          contract_address: target.contractAddress,
          method: target.method,
          args: JSON.stringify(target.args),
          result_raw: resultRaw,
          result_decoded: resultDecoded,
          block_number: blockNumber,
        });
        ingested++;

        if (this.broadcaster) {
          this.broadcaster.broadcast('contract', {
            contractAddress: target.contractAddress,
            method: target.method,
            resultRaw,
            resultDecoded,
            blockNumber,
          });
        }
      } catch {
        // Individual target failures don't stop the loop
      }
    }

    return ingested;
  }
}
