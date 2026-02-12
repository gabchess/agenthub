"use client";

import { clsx } from "clsx";
import { API_BASE } from "@/lib/api";
import { usePipelineStatus } from "@/lib/hooks/use-pipeline-status";
import { useBlockMetrics } from "@/lib/hooks/use-block-metrics";
import { usePriceSnapshots } from "@/lib/hooks/use-price-snapshots";
import { useBalanceSnapshots } from "@/lib/hooks/use-balance-snapshots";
import { useSSE } from "@/lib/hooks/use-sse";
import { PipelineHealthBar } from "./pipeline-health-bar";
import { BlockTicker } from "./block-ticker";
import { PriceCards } from "./price-cards";
import { BalanceTable } from "./balance-table";
import { IngestionStats } from "./ingestion-stats";

export function PipelineOverview() {
  const { statuses } = usePipelineStatus();
  const { blocks } = useBlockMetrics();
  const { prices } = usePriceSnapshots();
  const { balances } = useBalanceSnapshots();
  const { status: sseStatus } = useSSE(`${API_BASE}/api/pipeline/stream`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Pipeline</h2>
          <p className="text-xs text-gray-600 mt-0.5">Real-time data ingestion from Monad</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              sseStatus === "connected" && "bg-accent-green animate-pulse",
              sseStatus === "connecting" && "bg-accent-amber animate-pulse",
              sseStatus === "disconnected" && "bg-gray-600"
            )}
          />
          <span
            className={clsx(
              sseStatus === "connected" && "text-accent-green",
              sseStatus === "connecting" && "text-accent-amber",
              sseStatus === "disconnected" && "text-gray-600"
            )}
          >
            SSE: {sseStatus === "connected" ? "Connected" : sseStatus === "connecting" ? "Connecting" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Health Status Bar */}
      <section>
        <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2">Collector Health</h3>
        <PipelineHealthBar statuses={statuses} />
      </section>

      {/* Block Ticker */}
      <section>
        <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2">Latest Block</h3>
        <BlockTicker blocks={blocks} />
      </section>

      {/* Price Cards */}
      <section>
        <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2">Token Prices</h3>
        <PriceCards prices={prices} />
      </section>

      {/* Balance Table */}
      <section>
        <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2">Wallet Balances</h3>
        <div className="bg-surface border border-border rounded-lg p-4">
          <BalanceTable balances={balances} />
        </div>
      </section>

      {/* Ingestion Stats */}
      <section>
        <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2">Ingestion Statistics</h3>
        <div className="bg-surface border border-border rounded-lg p-4">
          <IngestionStats statuses={statuses} />
        </div>
      </section>
    </div>
  );
}
