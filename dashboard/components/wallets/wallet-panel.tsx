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
