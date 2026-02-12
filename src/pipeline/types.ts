/**
 * Pipeline-specific TypeScript types
 */

export type CollectorSource = 'blocks' | 'balances' | 'prices' | 'contracts' | 'health';

export type CollectorStatus = 'idle' | 'running' | 'error' | 'stopped';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface PipelineStatusRow {
  source: CollectorSource;
  status: CollectorStatus;
  last_poll_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  error_count: number;
  success_count: number;
  poll_interval_ms: number;
  avg_duration_ms: number | null;
  records_ingested: number;
  created_at: string;
  updated_at: string;
}

export interface BlockMetricRow {
  id: string;
  block_number: number;
  block_hash: string;
  timestamp: number;
  gas_used: string;
  gas_limit: string;
  base_fee_per_gas: string | null;
  transaction_count: number;
  block_time_ms: number | null;
  created_at: string;
}

export interface BalanceSnapshotRow {
  id: string;
  address: string;
  balance_wei: string;
  balance_formatted: string;
  block_number: number;
  chain: string;
  created_at: string;
}

export interface PriceSnapshotRow {
  id: string;
  chain_id: string;
  token_address: string;
  price_usd: string;
  price_native: string;
  volume_24h: string;
  liquidity_usd: string;
  price_change_24h: string;
  source: string;
  created_at: string;
}

export interface ContractEventRow {
  id: string;
  chain: string;
  contract_address: string;
  method: string;
  args: string | null;
  result_raw: string | null;
  result_decoded: string | null;
  block_number: number;
  created_at: string;
}

export interface SSEEvent {
  type: 'block' | 'balance' | 'price' | 'contract' | 'status' | 'health' | 'heartbeat' | 'connected';
  data: unknown;
}

export interface CollectorMetrics {
  source: CollectorSource;
  status: CollectorStatus;
  lastPollAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  errorCount: number;
  successCount: number;
  pollIntervalMs: number;
  avgDurationMs: number | null;
  recordsIngested: number;
  circuitState: CircuitBreakerState;
}

export interface PipelineHealthSnapshot {
  uptime: number;
  collectors: CollectorMetrics[];
  totalRecordsIngested: number;
  totalErrors: number;
}

export interface BlockCollectorConfig {
  enabled: boolean;
  pollIntervalMs: number;
}

export interface BalanceCollectorConfig {
  enabled: boolean;
  pollIntervalMs: number;
  addresses: string[];
}

export interface PriceCollectorConfig {
  enabled: boolean;
  pollIntervalMs: number;
  tokens: Array<{ chainId: string; address: string }>;
}

export interface ContractCollectorConfig {
  enabled: boolean;
  pollIntervalMs: number;
  targets: Array<{
    contractAddress: string;
    method: string;
    args: unknown[];
  }>;
}

export interface RetentionConfig {
  maxBlockMetrics: number;
  maxPriceSnapshots: number;
  maxBalanceSnapshots: number;
  maxContractEvents: number;
  cleanupIntervalMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

export interface PipelineConfig {
  blocks: BlockCollectorConfig;
  balances: BalanceCollectorConfig;
  prices: PriceCollectorConfig;
  contracts: ContractCollectorConfig;
  retention: RetentionConfig;
  circuitBreaker: CircuitBreakerConfig;
}
