"use client";

import { truncateAddress, relativeTime } from "@/lib/utils";
import { parseJsonSafe } from "@/lib/utils";
import type { Trace } from "@/lib/types";

export function WalletRow({ trace }: { trace: Trace }) {
  const data = parseJsonSafe(trace.data);
  const isX402 = data.type === "x402";

  return (
    <tr className="border-b border-border/30 hover:bg-raised/30 transition-colors">
      <td className="py-2 px-3 text-accent-purple font-mono text-[11px]">
        {data.from ? truncateAddress(data.from as string) : "—"}
      </td>
      <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">
        {data.to ? truncateAddress(data.to as string) : "—"}
      </td>
      <td className="py-2 px-3 text-accent-cyan font-mono text-[11px]">
        {trace.agent_id || "—"}
      </td>
      <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">
        <span className="flex items-center gap-1.5">
          {data.value ? String(data.value) : "—"}
          {isX402 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              x402
            </span>
          )}
        </span>
      </td>
      <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">
        {data.txHash ? truncateAddress(data.txHash as string) : "—"}
      </td>
      <td className="py-2 px-3 text-gray-500 text-[11px]">
        {relativeTime(trace.timestamp)}
      </td>
    </tr>
  );
}
