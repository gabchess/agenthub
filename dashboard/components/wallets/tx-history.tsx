"use client";

import type { Trace } from "@/lib/types";
import { WalletRow } from "./wallet-row";
import { EmptyState } from "@/components/ui/empty-state";

export function TxHistory({ traces }: { traces: Trace[] }) {
  if (traces.length === 0) {
    return <EmptyState message="No wallet transactions found" />;
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-gray-500 text-[10px] uppercase tracking-wider">
            <th className="text-left py-2 px-3 font-medium">From</th>
            <th className="text-left py-2 px-3 font-medium">To</th>
            <th className="text-left py-2 px-3 font-medium">Agent</th>
            <th className="text-left py-2 px-3 font-medium">Value</th>
            <th className="text-left py-2 px-3 font-medium">Tx Hash</th>
            <th className="text-left py-2 px-3 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((trace) => (
            <WalletRow key={trace.id} trace={trace} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
