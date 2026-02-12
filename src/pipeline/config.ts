/**
 * Pipeline configuration loader.
 *
 * Loads from ~/.openclaw/antfarm/pipeline.yml with sensible defaults.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';

import type { PipelineConfig } from './types.js';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'antfarm', 'pipeline.yml');

const DEFAULT_CONFIG: PipelineConfig = {
  blocks: {
    enabled: true,
    pollIntervalMs: 2000,
  },
  balances: {
    enabled: true,
    pollIntervalMs: 10000,
    addresses: [],
  },
  prices: {
    enabled: true,
    pollIntervalMs: 60000,
    tokens: [],
  },
  contracts: {
    enabled: true,
    pollIntervalMs: 30000,
    targets: [],
  },
  retention: {
    maxBlockMetrics: 100000,
    maxPriceSnapshots: 10000,
    maxBalanceSnapshots: 10000,
    maxContractEvents: 10000,
    cleanupIntervalMs: 300000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenMaxAttempts: 2,
  },
};

export function loadPipelineConfig(): PipelineConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = YAML.parse(raw);
      const pipeline = parsed?.pipeline ?? parsed ?? {};
      return mergeConfig(DEFAULT_CONFIG, pipeline);
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_CONFIG };
}

function mergeConfig(defaults: PipelineConfig, overrides: Record<string, unknown>): PipelineConfig {
  return {
    blocks: {
      ...defaults.blocks,
      ...(overrides.blocks as Partial<PipelineConfig['blocks']> ?? {}),
    },
    balances: {
      ...defaults.balances,
      ...(overrides.balances as Partial<PipelineConfig['balances']> ?? {}),
    },
    prices: {
      ...defaults.prices,
      ...(overrides.prices as Partial<PipelineConfig['prices']> ?? {}),
    },
    contracts: {
      ...defaults.contracts,
      ...(overrides.contracts as Partial<PipelineConfig['contracts']> ?? {}),
    },
    retention: {
      ...defaults.retention,
      ...(overrides.retention as Partial<PipelineConfig['retention']> ?? {}),
    },
    circuitBreaker: {
      ...defaults.circuitBreaker,
      ...(overrides.circuitBreaker as Partial<PipelineConfig['circuitBreaker']> ?? {}),
    },
  };
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
