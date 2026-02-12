"use client";

import type { Trace, TraceType } from "@/lib/types";
import { TraceTypeBadge } from "@/components/ui/trace-type-badge";
import { formatTimestamp, formatDuration, formatTokens } from "@/lib/utils";

interface TraceRowProps {
  trace: Trace;
  onClick: (trace: Trace) => void;
}

export function TraceRow({ trace, onClick }: TraceRowProps) {
  return (
    <tr
      className="border-b border-border/30 hover:bg-raised/30 cursor-pointer transition-colors"
      onClick={() => onClick(trace)}
    >
      <td className="py-1.5 px-3 text-gray-500 font-mono text-[11px]">
        {formatTimestamp(trace.timestamp)}
      </td>
      <td className="py-1.5 px-3">
        <TraceTypeBadge type={trace.trace_type as TraceType} />
      </td>
      <td className="py-1.5 px-3 text-accent-cyan font-mono text-[11px]">
        {trace.agent_id || "—"}
      </td>
      <td className="py-1.5 px-3 text-gray-500 font-mono text-[11px]">
        {trace.step_id ? trace.step_id.slice(0, 12) : "—"}
      </td>
      <td className="py-1.5 px-3 text-gray-400 font-mono text-[11px]">
        {trace.model || "—"}
      </td>
      <td className="py-1.5 px-3 text-gray-400 font-mono text-[11px]">
        {trace.input_tokens || trace.output_tokens
          ? `${formatTokens(trace.input_tokens)} / ${formatTokens(trace.output_tokens)}`
          : "—"}
      </td>
      <td className="py-1.5 px-3 text-gray-400 font-mono text-[11px]">
        {formatDuration(trace.duration_ms)}
      </td>
    </tr>
  );
}
