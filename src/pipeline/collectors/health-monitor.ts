/**
 * Health monitor — aggregates pipeline_status rows and broadcasts health events.
 */

import { getAllPipelineStatus } from '../db-pipeline.js';
import { BaseCollector } from './base-collector.js';
import type { CircuitBreakerConfig, PipelineHealthSnapshot, CollectorMetrics } from '../types.js';

const HEALTH_POLL_INTERVAL_MS = 5000;

export class HealthMonitor extends BaseCollector {
  private startedAt: number;

  constructor(cbConfig: CircuitBreakerConfig) {
    super('health', HEALTH_POLL_INTERVAL_MS, cbConfig);
    this.startedAt = Date.now();
  }

  async collect(): Promise<number> {
    const statuses = getAllPipelineStatus();

    const collectors: CollectorMetrics[] = statuses.map((s) => ({
      source: s.source as CollectorMetrics['source'],
      status: s.status as CollectorMetrics['status'],
      lastPollAt: s.last_poll_at,
      lastSuccessAt: s.last_success_at,
      lastError: s.last_error,
      errorCount: s.error_count,
      successCount: s.success_count,
      pollIntervalMs: s.poll_interval_ms,
      avgDurationMs: s.avg_duration_ms,
      recordsIngested: s.records_ingested,
      circuitState: 'CLOSED', // Will be updated by orchestrator if needed
    }));

    const snapshot: PipelineHealthSnapshot = {
      uptime: Date.now() - this.startedAt,
      collectors,
      totalRecordsIngested: collectors.reduce((sum, c) => sum + c.recordsIngested, 0),
      totalErrors: collectors.reduce((sum, c) => sum + c.errorCount, 0),
    };

    if (this.broadcaster) {
      this.broadcaster.broadcast('health', snapshot);
    }

    return 0; // Health monitor doesn't ingest records
  }
}
