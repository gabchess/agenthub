/**
 * Abstract base collector with poll loop, circuit breaker, and metrics tracking.
 *
 * Uses setTimeout (not setInterval) to allow variable timing.
 * Each poll: circuitBreaker.execute(() => this.collect())
 */

import { CircuitBreaker } from '../circuit-breaker.js';
import { upsertPipelineStatus } from '../db-pipeline.js';
import { logger } from '../../lib/logger.js';
import type {
  CollectorSource,
  CollectorStatus,
  CollectorMetrics,
  CircuitBreakerConfig,
} from '../types.js';
import type { SSEBroadcaster } from '../sse-broadcaster.js';

export abstract class BaseCollector {
  readonly source: CollectorSource;
  protected pollIntervalMs: number;
  protected circuitBreaker: CircuitBreaker;
  protected broadcaster: SSEBroadcaster | null = null;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private _status: CollectorStatus = 'idle';
  private lastPollAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastError: string | null = null;
  private errorCount = 0;
  private successCount = 0;
  private avgDurationMs: number | null = null;
  private recordsIngested = 0;

  constructor(
    source: CollectorSource,
    pollIntervalMs: number,
    cbConfig: CircuitBreakerConfig,
  ) {
    this.source = source;
    this.pollIntervalMs = pollIntervalMs;
    this.circuitBreaker = new CircuitBreaker(cbConfig);
  }

  setBroadcaster(broadcaster: SSEBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  /**
   * Subclasses implement this to do the actual data collection.
   * Returns the number of records ingested.
   */
  abstract collect(): Promise<number>;

  start(): void {
    if (this.running) return;
    this.running = true;
    this._status = 'running';
    logger.info(`[pipeline] ${this.source} collector started (${this.pollIntervalMs}ms interval)`);
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    this._status = 'stopped';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info(`[pipeline] ${this.source} collector stopped`);
  }

  getMetrics(): CollectorMetrics {
    return {
      source: this.source,
      status: this._status,
      lastPollAt: this.lastPollAt,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      errorCount: this.errorCount,
      successCount: this.successCount,
      pollIntervalMs: this.pollIntervalMs,
      avgDurationMs: this.avgDurationMs,
      recordsIngested: this.recordsIngested,
      circuitState: this.circuitBreaker.getState(),
    };
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    const start = Date.now();
    this.lastPollAt = new Date().toISOString();

    try {
      const count = await this.circuitBreaker.execute(() => this.collect());
      const duration = Date.now() - start;

      this.recordsIngested += count;
      this.successCount++;
      this.lastSuccessAt = new Date().toISOString();
      this.lastError = null;
      this._status = 'running';

      // Exponential moving average for duration
      this.avgDurationMs = this.avgDurationMs
        ? Math.round(this.avgDurationMs * 0.8 + duration * 0.2)
        : duration;

    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : String(error);
      this._status = 'error';
      logger.error(`[pipeline] ${this.source} poll failed: ${this.lastError}`);
    }

    // Persist status
    try {
      upsertPipelineStatus(this.source, this._status, this.pollIntervalMs, {
        lastPollAt: this.lastPollAt,
        lastSuccessAt: this.lastSuccessAt,
        lastError: this.lastError,
        errorCount: this.errorCount,
        successCount: this.successCount,
        avgDurationMs: this.avgDurationMs,
        recordsIngested: this.recordsIngested,
      });
    } catch {
      // Don't let status persistence failure break the loop
    }

    this.scheduleNext();
  }
}
