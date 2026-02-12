/**
 * Pipeline database migrations and typed helpers.
 *
 * Uses the same getDb() + antfarm.db as the rest of the system.
 * All tables use CREATE TABLE IF NOT EXISTS for idempotency.
 */

import { getDb } from '../db.js';
import type {
  BlockMetricRow,
  BalanceSnapshotRow,
  PriceSnapshotRow,
  ContractEventRow,
  PipelineStatusRow,
  CollectorSource,
  CollectorStatus,
} from './types.js';

export function migratePipelineTables(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_block_metrics (
      id TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL UNIQUE,
      block_hash TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      gas_used TEXT NOT NULL,
      gas_limit TEXT NOT NULL,
      base_fee_per_gas TEXT,
      transaction_count INTEGER NOT NULL,
      block_time_ms INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pbm_number ON pipeline_block_metrics(block_number);
    CREATE INDEX IF NOT EXISTS idx_pbm_created ON pipeline_block_metrics(created_at);

    CREATE TABLE IF NOT EXISTS pipeline_balance_snapshots (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      balance_wei TEXT NOT NULL,
      balance_formatted TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      chain TEXT NOT NULL DEFAULT 'monad-testnet',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pbs_address ON pipeline_balance_snapshots(address);
    CREATE INDEX IF NOT EXISTS idx_pbs_created ON pipeline_balance_snapshots(created_at);

    CREATE TABLE IF NOT EXISTS pipeline_price_snapshots (
      id TEXT PRIMARY KEY,
      chain_id TEXT NOT NULL,
      token_address TEXT NOT NULL,
      price_usd TEXT NOT NULL,
      price_native TEXT NOT NULL,
      volume_24h TEXT NOT NULL,
      liquidity_usd TEXT NOT NULL,
      price_change_24h TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'dexscreener',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pps_token ON pipeline_price_snapshots(chain_id, token_address);
    CREATE INDEX IF NOT EXISTS idx_pps_created ON pipeline_price_snapshots(created_at);

    CREATE TABLE IF NOT EXISTS pipeline_contract_events (
      id TEXT PRIMARY KEY,
      chain TEXT NOT NULL DEFAULT 'monad-testnet',
      contract_address TEXT NOT NULL,
      method TEXT NOT NULL,
      args TEXT,
      result_raw TEXT,
      result_decoded TEXT,
      block_number INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pce_addr ON pipeline_contract_events(contract_address);
    CREATE INDEX IF NOT EXISTS idx_pce_created ON pipeline_contract_events(created_at);

    CREATE TABLE IF NOT EXISTS pipeline_status (
      source TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'idle',
      last_poll_at TEXT,
      last_success_at TEXT,
      last_error TEXT,
      error_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      poll_interval_ms INTEGER NOT NULL,
      avg_duration_ms INTEGER,
      records_ingested INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function generateId(): string {
  return crypto.randomUUID();
}

// --- Block Metrics ---

export function insertBlockMetric(row: Omit<BlockMetricRow, 'id' | 'created_at'>): string {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO pipeline_block_metrics
    (id, block_number, block_hash, timestamp, gas_used, gas_limit, base_fee_per_gas, transaction_count, block_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, row.block_number, row.block_hash, row.timestamp, row.gas_used, row.gas_limit, row.base_fee_per_gas, row.transaction_count, row.block_time_ms, now);
  return id;
}

export function getRecentBlockMetrics(limit = 50): BlockMetricRow[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM pipeline_block_metrics ORDER BY block_number DESC LIMIT ?'
  ).all(limit) as unknown as BlockMetricRow[];
}

export function getLatestBlockNumber(): number | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT block_number FROM pipeline_block_metrics ORDER BY block_number DESC LIMIT 1'
  ).get() as unknown as { block_number: number } | undefined;
  return row?.block_number ?? null;
}

// --- Balance Snapshots ---

export function insertBalanceSnapshot(row: Omit<BalanceSnapshotRow, 'id' | 'created_at'>): string {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pipeline_balance_snapshots
    (id, address, balance_wei, balance_formatted, block_number, chain, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, row.address, row.balance_wei, row.balance_formatted, row.block_number, row.chain, now);
  return id;
}

export function getRecentBalanceSnapshots(address?: string, limit = 50): BalanceSnapshotRow[] {
  const db = getDb();
  if (address) {
    return db.prepare(
      'SELECT * FROM pipeline_balance_snapshots WHERE address = ? ORDER BY created_at DESC LIMIT ?'
    ).all(address, limit) as unknown as BalanceSnapshotRow[];
  }
  return db.prepare(
    'SELECT * FROM pipeline_balance_snapshots ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as unknown as BalanceSnapshotRow[];
}

// --- Price Snapshots ---

export function insertPriceSnapshot(row: Omit<PriceSnapshotRow, 'id' | 'created_at'>): string {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pipeline_price_snapshots
    (id, chain_id, token_address, price_usd, price_native, volume_24h, liquidity_usd, price_change_24h, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, row.chain_id, row.token_address, row.price_usd, row.price_native, row.volume_24h, row.liquidity_usd, row.price_change_24h, row.source, now);
  return id;
}

export function getRecentPriceSnapshots(tokenAddress?: string, chainId?: string, limit = 100): PriceSnapshotRow[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (tokenAddress) {
    conditions.push('token_address = ?');
    params.push(tokenAddress);
  }
  if (chainId) {
    conditions.push('chain_id = ?');
    params.push(chainId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  return db.prepare(
    `SELECT * FROM pipeline_price_snapshots ${where} ORDER BY created_at DESC LIMIT ?`
  ).all(...params) as unknown as PriceSnapshotRow[];
}

// --- Contract Events ---

export function insertContractEvent(row: Omit<ContractEventRow, 'id' | 'created_at'>): string {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pipeline_contract_events
    (id, chain, contract_address, method, args, result_raw, result_decoded, block_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, row.chain, row.contract_address, row.method, row.args, row.result_raw, row.result_decoded, row.block_number, now);
  return id;
}

export function getRecentContractEvents(contractAddress?: string, method?: string, limit = 50): ContractEventRow[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (contractAddress) {
    conditions.push('contract_address = ?');
    params.push(contractAddress);
  }
  if (method) {
    conditions.push('method = ?');
    params.push(method);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  return db.prepare(
    `SELECT * FROM pipeline_contract_events ${where} ORDER BY created_at DESC LIMIT ?`
  ).all(...params) as unknown as ContractEventRow[];
}

// --- Pipeline Status ---

export function upsertPipelineStatus(
  source: CollectorSource,
  status: CollectorStatus,
  pollIntervalMs: number,
  updates: {
    lastPollAt?: string | null;
    lastSuccessAt?: string | null;
    lastError?: string | null;
    errorCount?: number;
    successCount?: number;
    avgDurationMs?: number | null;
    recordsIngested?: number;
  }
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM pipeline_status WHERE source = ?').get(source) as unknown as PipelineStatusRow | undefined;

  if (existing) {
    db.prepare(`
      UPDATE pipeline_status SET
        status = ?,
        last_poll_at = COALESCE(?, last_poll_at),
        last_success_at = COALESCE(?, last_success_at),
        last_error = ?,
        error_count = COALESCE(?, error_count),
        success_count = COALESCE(?, success_count),
        avg_duration_ms = COALESCE(?, avg_duration_ms),
        records_ingested = COALESCE(?, records_ingested),
        updated_at = ?
      WHERE source = ?
    `).run(
      status,
      updates.lastPollAt ?? null,
      updates.lastSuccessAt ?? null,
      updates.lastError ?? null,
      updates.errorCount ?? null,
      updates.successCount ?? null,
      updates.avgDurationMs ?? null,
      updates.recordsIngested ?? null,
      now,
      source,
    );
  } else {
    db.prepare(`
      INSERT INTO pipeline_status
      (source, status, last_poll_at, last_success_at, last_error, error_count, success_count, poll_interval_ms, avg_duration_ms, records_ingested, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      source,
      status,
      updates.lastPollAt ?? null,
      updates.lastSuccessAt ?? null,
      updates.lastError ?? null,
      updates.errorCount ?? 0,
      updates.successCount ?? 0,
      pollIntervalMs,
      updates.avgDurationMs ?? null,
      updates.recordsIngested ?? 0,
      now,
      now,
    );
  }
}

export function getAllPipelineStatus(): PipelineStatusRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM pipeline_status ORDER BY source').all() as unknown as PipelineStatusRow[];
}

// --- Retention ---

export function pruneTable(table: string, maxRows: number): number {
  const db = getDb();
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as unknown as { cnt: number };
  if (countRow.cnt <= maxRows) return 0;

  const toDelete = countRow.cnt - maxRows;
  db.prepare(`
    DELETE FROM ${table} WHERE id IN (
      SELECT id FROM ${table} ORDER BY created_at ASC LIMIT ?
    )
  `).run(toDelete);
  return toDelete;
}
