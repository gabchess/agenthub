"use client";

import { formatDistanceToNow } from "date-fns";

interface BlockMetric {
  block_number: number;
  block_hash: string;
  timestamp: number;
  gas_used: string;
  gas_limit: string;
  base_fee_per_gas: string | null;
  transaction_count: number;
  block_time_ms: number | null;
}

function formatGwei(wei: string | null): string {
  if (!wei) return "—";
  const gwei = Number(BigInt(wei)) / 1e9;
  return gwei.toFixed(2);
}

export function BlockTicker({ blocks }: { blocks: BlockMetric[] }) {
  const latest = blocks[0];

  if (!latest) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-gray-600 text-sm font-mono">$ waiting for blocks...</div>
      </div>
    );
  }

  const gasPercent = ((Number(BigInt(latest.gas_used)) / Number(BigInt(latest.gas_limit))) * 100).toFixed(1);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 glow-green">
      <div className="font-mono">
        <span className="text-gray-600">$ block </span>
        <span className="text-accent-green text-2xl font-bold text-glow-green">
          {latest.block_number.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono text-gray-500">
        <span>
          gas <span className="text-gray-300">{formatGwei(latest.base_fee_per_gas)} gwei</span>
        </span>
        <span>
          used <span className="text-gray-300">{gasPercent}%</span>
        </span>
        <span>
          txns <span className="text-gray-300">{latest.transaction_count}</span>
        </span>
        {latest.block_time_ms !== null && (
          <span>
            time <span className="text-gray-300">{latest.block_time_ms}ms</span>
          </span>
        )}
        <span>
          hash <span className="text-gray-300">{latest.block_hash.slice(0, 10)}...</span>
        </span>
      </div>
    </div>
  );
}
