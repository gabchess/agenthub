/**
 * Pipeline orchestrator — lifecycle management for all collectors + broadcaster + retention.
 */

import { loadPipelineConfig } from './config.js';
import { migratePipelineTables } from './db-pipeline.js';
import { SSEBroadcaster } from './sse-broadcaster.js';
import { RetentionManager } from './retention.js';
import { BlockCollector } from './collectors/block-collector.js';
import { BalanceCollector } from './collectors/balance-collector.js';
import { PriceCollector } from './collectors/price-collector.js';
import { ContractCollector } from './collectors/contract-collector.js';
import { HealthMonitor } from './collectors/health-monitor.js';
import { logger } from '../lib/logger.js';
import type { BaseCollector } from './collectors/base-collector.js';
import type { PipelineConfig } from './types.js';

export class PipelineOrchestrator {
  private collectors: BaseCollector[] = [];
  private broadcaster: SSEBroadcaster;
  private retention: RetentionManager;
  private config: PipelineConfig;

  constructor() {
    this.config = loadPipelineConfig();
    this.broadcaster = new SSEBroadcaster();
    this.retention = new RetentionManager(this.config.retention);
  }

  getBroadcaster(): SSEBroadcaster {
    return this.broadcaster;
  }

  getCollectors(): BaseCollector[] {
    return this.collectors;
  }

  start(): void {
    logger.info('[pipeline] orchestrator starting...');

    // Run migrations
    migratePipelineTables();
    logger.info('[pipeline] database tables migrated');

    // Start SSE broadcaster
    this.broadcaster.start();

    // Create collectors based on config
    const cb = this.config.circuitBreaker;

    if (this.config.blocks.enabled) {
      const collector = new BlockCollector(this.config.blocks.pollIntervalMs, cb);
      collector.setBroadcaster(this.broadcaster);
      this.collectors.push(collector);
    }

    if (this.config.balances.enabled && this.config.balances.addresses.length > 0) {
      const collector = new BalanceCollector(
        this.config.balances.pollIntervalMs,
        this.config.balances.addresses,
        cb,
      );
      collector.setBroadcaster(this.broadcaster);
      this.collectors.push(collector);
    }

    if (this.config.prices.enabled && this.config.prices.tokens.length > 0) {
      const collector = new PriceCollector(
        this.config.prices.pollIntervalMs,
        this.config.prices.tokens,
        cb,
      );
      collector.setBroadcaster(this.broadcaster);
      this.collectors.push(collector);
    }

    if (this.config.contracts.enabled && this.config.contracts.targets.length > 0) {
      const collector = new ContractCollector(
        this.config.contracts.pollIntervalMs,
        this.config.contracts.targets,
        cb,
      );
      collector.setBroadcaster(this.broadcaster);
      this.collectors.push(collector);
    }

    // Health monitor always runs
    const healthMonitor = new HealthMonitor(cb);
    healthMonitor.setBroadcaster(this.broadcaster);
    this.collectors.push(healthMonitor);

    // Start all collectors
    for (const collector of this.collectors) {
      collector.start();
    }

    // Start retention manager
    this.retention.start();

    logger.info(`[pipeline] orchestrator started with ${this.collectors.length} collectors`);
  }

  stop(): void {
    logger.info('[pipeline] orchestrator stopping...');

    for (const collector of this.collectors) {
      collector.stop();
    }
    this.collectors = [];

    this.retention.stop();
    this.broadcaster.stop();

    logger.info('[pipeline] orchestrator stopped');
  }
}
