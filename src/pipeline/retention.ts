/**
 * Retention manager — periodic cleanup of old rows.
 *
 * Runs every N minutes and trims each table to its configured max.
 */

import { pruneTable } from './db-pipeline.js';
import { logger } from '../lib/logger.js';
import type { RetentionConfig } from './types.js';

export class RetentionManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: RetentionConfig;

  constructor(config: RetentionConfig) {
    this.config = config;
  }

  start(): void {
    logger.info(`[pipeline] retention manager started (${this.config.cleanupIntervalMs}ms interval)`);
    this.timer = setInterval(() => this.cleanup(), this.config.cleanupIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private cleanup(): void {
    try {
      const deleted = {
        blocks: pruneTable('pipeline_block_metrics', this.config.maxBlockMetrics),
        prices: pruneTable('pipeline_price_snapshots', this.config.maxPriceSnapshots),
        balances: pruneTable('pipeline_balance_snapshots', this.config.maxBalanceSnapshots),
        contracts: pruneTable('pipeline_contract_events', this.config.maxContractEvents),
      };

      const total = deleted.blocks + deleted.prices + deleted.balances + deleted.contracts;
      if (total > 0) {
        logger.info(`[pipeline] retention cleanup: ${total} rows deleted (blocks=${deleted.blocks} prices=${deleted.prices} balances=${deleted.balances} contracts=${deleted.contracts})`);
      }
    } catch (error) {
      logger.error(`[pipeline] retention cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
