"use client";

import { truncateAddress, relativeTime } from "@/lib/utils";
import { parseJsonSafe } from "@/lib/utils";
import type { Trace } from "@/lib/types";

export function WalletRow({ trace }: { trace: Trace }) {
  const data = parseJsonSafe(trace.data);

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
        {data.value ? String(data.value) : "—"}
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
