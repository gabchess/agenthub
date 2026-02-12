"use client";

import { clsx } from "clsx";
import { GlowCard } from "@/components/ui/glow-card";
import { truncateAddress } from "@/lib/utils";

interface PriceSnapshot {
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

function formatUsd(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return "$0.00";
  if (num < 0.01) return `$${num.toFixed(6)}`;
  if (num < 1) return `$${num.toFixed(4)}`;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVolume(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return "$0";
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function PriceCards({ prices }: { prices: PriceSnapshot[] }) {
  // Group by token_address, take latest for each
  const latestByToken = new Map<string, PriceSnapshot>();
  const historyByToken = new Map<string, PriceSnapshot[]>();

  for (const p of prices) {
    const key = `${p.chain_id}:${p.token_address}`;
    if (!latestByToken.has(key)) {
      latestByToken.set(key, p);
    }
    if (!historyByToken.has(key)) {
      historyByToken.set(key, []);
    }
    historyByToken.get(key)!.push(p);
  }

  if (latestByToken.size === 0) {
    return (
      <div className="text-gray-600 text-sm font-mono">No price data yet</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from(latestByToken.entries()).map(([key, price]) => {
        const change = parseFloat(price.price_change_24h);
        const isUp = change > 0;
        const isDown = change < 0;
        const history = historyByToken.get(key) ?? [];
        const recentPrices = history.slice(0, 20).reverse();

        return (
          <GlowCard key={key} glow={isUp}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-600 font-mono">
                  {price.chain_id} / {truncateAddress(price.token_address)}
                </div>
                <div className="text-lg font-bold text-gray-200 mt-1">
                  {formatUsd(price.price_usd)}
                </div>
              </div>
              <div
                className={clsx(
                  "text-sm font-mono px-2 py-0.5 rounded",
                  isUp && "text-accent-green bg-accent-green/10",
                  isDown && "text-accent-red bg-accent-red/10",
                  !isUp && !isDown && "text-gray-500 bg-gray-500/10"
                )}
              >
                {isUp ? "+" : ""}{change.toFixed(2)}%
              </div>
            </div>

            <div className="flex gap-4 mt-2 text-xs text-gray-600">
              <span>Vol: {formatVolume(price.volume_24h)}</span>
              <span>Liq: {formatVolume(price.liquidity_usd)}</span>
            </div>

            {/* Mini bar chart */}
            {recentPrices.length > 1 && (
              <div className="flex items-end gap-px mt-3 h-8">
                {recentPrices.map((p, i) => {
                  const val = parseFloat(p.price_usd);
                  const allVals = recentPrices.map((x) => parseFloat(x.price_usd));
                  const min = Math.min(...allVals);
                  const max = Math.max(...allVals);
                  const range = max - min || 1;
                  const height = Math.max(4, ((val - min) / range) * 100);

                  return (
                    <div
                      key={i}
                      className={clsx(
                        "flex-1 rounded-t",
                        isUp ? "bg-accent-green/40" : isDown ? "bg-accent-red/40" : "bg-gray-600/40"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
            )}
          </GlowCard>
        );
      })}
    </div>
  );
}
