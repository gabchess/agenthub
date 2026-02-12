/**
 * Block collector — polls Monad for new blocks and stores metrics.
 *
 * Uses MonadClient.publicClient.getBlock() to fetch block data.
 * Tracks lastBlockNumber and catches up (max 10 blocks per poll).
 */

import { MonadClient } from '../../chains/monad.js';
import { insertBlockMetric, getLatestBlockNumber } from '../db-pipeline.js';
import { BaseCollector } from './base-collector.js';
import type { CircuitBreakerConfig } from '../types.js';

const MAX_CATCHUP_BLOCKS = 10;

export class BlockCollector extends BaseCollector {
  private client: MonadClient;
  private lastBlockNumber: number | null = null;

  constructor(pollIntervalMs: number, cbConfig: CircuitBreakerConfig) {
    super('blocks', pollIntervalMs, cbConfig);
    this.client = new MonadClient();
  }

  async collect(): Promise<number> {
    // Initialize from DB if needed
    if (this.lastBlockNumber === null) {
      this.lastBlockNumber = getLatestBlockNumber();
    }

    const currentBlock = await this.client.getBlockNumber();
    const current = Number(currentBlock);

    // Nothing new
    if (this.lastBlockNumber !== null && current <= this.lastBlockNumber) {
      return 0;
    }

    const startBlock = this.lastBlockNumber !== null
      ? this.lastBlockNumber + 1
      : current;

    // Cap catch-up to avoid overloading
    const fromBlock = Math.max(startBlock, current - MAX_CATCHUP_BLOCKS + 1);
    let ingested = 0;

    for (let blockNum = fromBlock; blockNum <= current; blockNum++) {
      try {
        const block = await this.client.publicClient.getBlock({
          blockNumber: BigInt(blockNum),
        });

        // Compute block time from previous block
        let blockTimeMs: number | null = null;
        if (blockNum > fromBlock || this.lastBlockNumber !== null) {
          try {
            const prevBlock = await this.client.publicClient.getBlock({
              blockNumber: BigInt(blockNum - 1),
            });
            blockTimeMs = Number(block.timestamp - prevBlock.timestamp) * 1000;
          } catch {
            // Skip block time if previous block fetch fails
          }
        }

        insertBlockMetric({
          block_number: Number(block.number),
          block_hash: block.hash,
          timestamp: Number(block.timestamp),
          gas_used: block.gasUsed.toString(),
          gas_limit: block.gasLimit.toString(),
          base_fee_per_gas: block.baseFeePerGas?.toString() ?? null,
          transaction_count: block.transactions.length,
          block_time_ms: blockTimeMs,
        });

        ingested++;

        // Broadcast SSE event
        if (this.broadcaster) {
          this.broadcaster.broadcast('block', {
            blockNumber: Number(block.number),
            blockHash: block.hash,
            timestamp: Number(block.timestamp),
            gasUsed: block.gasUsed.toString(),
            gasLimit: block.gasLimit.toString(),
            baseFeePerGas: block.baseFeePerGas?.toString() ?? null,
            transactionCount: block.transactions.length,
            blockTimeMs: blockTimeMs,
          });
        }
      } catch {
        // Skip individual block failures — will retry on next poll
        break;
      }
    }

    this.lastBlockNumber = current;
    return ingested;
  }
}
