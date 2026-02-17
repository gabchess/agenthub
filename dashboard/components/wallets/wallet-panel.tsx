"use client";

import { useWallets } from "@/lib/hooks/use-wallets";
import { TxHistory } from "./tx-history";
import { GlowCard } from "@/components/ui/glow-card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { parseJsonSafe } from "@/lib/utils";

export function WalletPanel() {
  const { walletTraces, isLoading } = useWallets();

  // Extract unique wallet addresses from traces
  const walletAddresses = new Set<string>();
  for (const trace of walletTraces) {
    const data = parseJsonSafe(trace.data);
    if (data.from) walletAddresses.add(data.from as string);
    if (data.to) walletAddresses.add(data.to as string);
  }

  // Compute x402 payment summary from traces
  const x402Traces = walletTraces.filter((t) => {
    const d = parseJsonSafe(t.data);
    return d.type === "x402";
  });
  const x402Count = x402Traces.length;
  const x402TotalSpent = x402Traces.reduce((sum, t) => {
    const d = parseJsonSafe(t.data);
    return sum + (typeof d.amount === "number" ? d.amount : 0);
  }, 0);
  const x402Network = x402Traces.length > 0
    ? (parseJsonSafe(x402Traces[0].data).network as string) || "base-sepolia"
    : "base-sepolia";

  return (
    <div className="space-y-6">
      {/* Wallet summary cards */}
      {walletAddresses.size > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(walletAddresses)
            .slice(0, 6)
            .map((addr) => {
              const txCount = walletTraces.filter((t) => {
                const d = parseJsonSafe(t.data);
                return d.from === addr || d.to === addr;
              }).length;

              return (
                <GlowCard key={addr} glow={txCount > 0}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-accent-purple" />
                    <span className="text-accent-purple font-mono text-xs">
                      {addr.slice(0, 6)}...{addr.slice(-4)}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {txCount} transaction{txCount !== 1 ? "s" : ""}
                  </div>
                </GlowCard>
              );
            })}
        </div>
      )}

      {/* x402 Payments section */}
      {x402Count > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            x402 Payments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlowCard className="border-accent-cyan/20">
              <div className="text-[11px] text-gray-500 mb-1">Payments</div>
              <div className="text-lg font-mono text-accent-cyan">
                {x402Count}
              </div>
            </GlowCard>
            <GlowCard className="border-accent-cyan/20">
              <div className="text-[11px] text-gray-500 mb-1">Spent</div>
              <div className="text-lg font-mono text-accent-cyan">
                ${x402TotalSpent.toFixed(2)}
              </div>
            </GlowCard>
            <GlowCard className="border-accent-cyan/20">
              <div className="text-[11px] text-gray-500 mb-1">Network</div>
              <div className="text-lg font-mono text-accent-cyan capitalize">
                {x402Network}
              </div>
            </GlowCard>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Recent Transactions
        </h3>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : (
          <TxHistory traces={walletTraces} />
        )}
      </div>
    </div>
  );
}
