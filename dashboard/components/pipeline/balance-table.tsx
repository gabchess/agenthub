"use client";

import { truncateAddress, relativeTime } from "@/lib/utils";

interface BalanceSnapshot {
  id: string;
  address: string;
  balance_wei: string;
  balance_formatted: string;
  block_number: number;
  chain: string;
  created_at: string;
}

export function BalanceTable({ balances }: { balances: BalanceSnapshot[] }) {
  // Deduplicate: show latest per address
  const latestByAddress = new Map<string, BalanceSnapshot>();
  for (const b of balances) {
    if (!latestByAddress.has(b.address)) {
      latestByAddress.set(b.address, b);
    }
  }

  const rows = Array.from(latestByAddress.values());

  if (rows.length === 0) {
    return (
      <div className="text-gray-600 text-sm font-mono">No balance data yet</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-gray-600 border-b border-border">
            <th className="text-left py-2 px-3">Address</th>
            <th className="text-right py-2 px-3">Balance</th>
            <th className="text-right py-2 px-3">Block</th>
            <th className="text-right py-2 px-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.address} className="border-b border-border/50 hover:bg-raised/50">
              <td className="py-2 px-3 text-accent-purple">{truncateAddress(b.address)}</td>
              <td className="py-2 px-3 text-right text-gray-300">{b.balance_formatted}</td>
              <td className="py-2 px-3 text-right text-gray-500">#{b.block_number.toLocaleString()}</td>
              <td className="py-2 px-3 text-right text-gray-600">{relativeTime(b.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
