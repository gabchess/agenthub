import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DB_DIR = path.join(os.homedir(), ".openclaw", "agenthub");
const DB_PATH = path.join(DB_DIR, "agenthub.db");

let _db: DatabaseSync | null = null;
let _dbOpenedAt = 0;
const DB_MAX_AGE_MS = 5000;

export function getDb(): DatabaseSync {
  const now = Date.now();
  if (_db && (now - _dbOpenedAt) < DB_MAX_AGE_MS) return _db;
  if (_db) { try { _db.close(); } catch {} }

  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  _dbOpenedAt = now;
  _db.exec("PRAGMA journal_mode=WAL");
  _db.exec("PRAGMA foreign_keys=ON");
  migrate(_db);
  return _db;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      context TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id),
      step_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      input_template TEXT NOT NULL,
      expects TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      output TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 2,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id),
      story_index INTEGER NOT NULL,
      story_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      acceptance_criteria TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      output TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 2,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_traces (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_id TEXT,
      agent_id TEXT,
      trace_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      duration_ms INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      model TEXT,
      extended_thinking_used BOOLEAN,
      data TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_guardrails (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL UNIQUE,
      tool_allowlist TEXT,
      tool_denylist TEXT,
      max_spend_per_tx TEXT,
      max_spend_per_run TEXT,
      approval_threshold TEXT,
      require_simulation BOOLEAN,
      parallel_allowed BOOLEAN,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_state (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(run_id, agent_id, namespace, key)
    );
  `);

  // Add columns to steps table for backwards compat
  const cols = db.prepare("PRAGMA table_info(steps)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("type")) {
    db.exec("ALTER TABLE steps ADD COLUMN type TEXT NOT NULL DEFAULT 'single'");
  }
  if (!colNames.has("loop_config")) {
    db.exec("ALTER TABLE steps ADD COLUMN loop_config TEXT");
  }
  if (!colNames.has("current_story_id")) {
    db.exec("ALTER TABLE steps ADD COLUMN current_story_id TEXT");
  }
  if (!colNames.has("thinking_level")) {
    db.exec("ALTER TABLE steps ADD COLUMN thinking_level TEXT");
  }
  if (!colNames.has("token_budget")) {
    db.exec("ALTER TABLE steps ADD COLUMN token_budget INTEGER");
  }
  if (!colNames.has("extended_thinking")) {
    db.exec("ALTER TABLE steps ADD COLUMN extended_thinking BOOLEAN");
  }
  if (!colNames.has("parallel_group")) {
    db.exec("ALTER TABLE steps ADD COLUMN parallel_group TEXT");
  }
  if (!colNames.has("parallel_sequence")) {
    db.exec("ALTER TABLE steps ADD COLUMN parallel_sequence INTEGER");
  }

  // Add columns to runs table for backwards compat
  const runCols = db.prepare("PRAGMA table_info(runs)").all() as Array<{ name: string }>;
  const runColNames = new Set(runCols.map((c) => c.name));
  if (!runColNames.has("notify_url")) {
    db.exec("ALTER TABLE runs ADD COLUMN notify_url TEXT");
  }
  if (!runColNames.has("parallel_execution_enabled")) {
    db.exec("ALTER TABLE runs ADD COLUMN parallel_execution_enabled BOOLEAN");
  }
  if (!runColNames.has("max_parallel_agents")) {
    db.exec("ALTER TABLE runs ADD COLUMN max_parallel_agents INTEGER");
  }
  if (!runColNames.has("trace_hash")) {
    db.exec("ALTER TABLE runs ADD COLUMN trace_hash TEXT");
  }
  if (!runColNames.has("trace_tx_hash")) {
    db.exec("ALTER TABLE runs ADD COLUMN trace_tx_hash TEXT");
  }
  if (!runColNames.has("trace_committed_at")) {
    db.exec("ALTER TABLE runs ADD COLUMN trace_committed_at TEXT");
  }

  // Create indexes for execution_traces table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_traces_run_id ON execution_traces(run_id);
    CREATE INDEX IF NOT EXISTS idx_traces_step_id ON execution_traces(step_id);
    CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON execution_traces(timestamp);
    CREATE INDEX IF NOT EXISTS idx_traces_agent_id ON execution_traces(agent_id);
  `);

  // Create indexes for agent_state table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_state_run ON agent_state(run_id);
    CREATE INDEX IF NOT EXISTS idx_agent_state_namespace ON agent_state(namespace);
  `);

  // Agent XP system tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_xp (
      id TEXT PRIMARY KEY,
      agent_archetype TEXT NOT NULL UNIQUE,
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      level_name TEXT DEFAULT 'Rookie',
      steps_completed INTEGER DEFAULT 0,
      steps_failed INTEGER DEFAULT 0,
      avg_duration_ms INTEGER DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      success_rate INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_xp_events (
      id TEXT PRIMARY KEY,
      agent_archetype TEXT NOT NULL,
      run_id TEXT,
      step_id TEXT,
      event_type TEXT NOT NULL,
      xp_delta INTEGER NOT NULL,
      step_type TEXT,
      difficulty_tier INTEGER,
      duration_ms INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      was_retry BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_xp_events_archetype ON agent_xp_events(agent_archetype);
    CREATE INDEX IF NOT EXISTS idx_xp_events_run ON agent_xp_events(run_id);
  `);

  // Persistent memory across runs
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agent_archetype TEXT NOT NULL,
      namespace TEXT NOT NULL DEFAULT 'default',
      key TEXT NOT NULL,
      value TEXT,
      source_run_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(agent_archetype, namespace, key)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_memory_archetype ON agent_memory(agent_archetype);
  `);
}

export function getDbPath(): string {
  return DB_PATH;
}
