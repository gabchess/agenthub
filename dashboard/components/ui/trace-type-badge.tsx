import { clsx } from "clsx";
import { TRACE_TYPE_COLORS } from "@/lib/constants";
import type { TraceType } from "@/lib/types";

export function TraceTypeBadge({ type }: { type: TraceType }) {
  const colorClass =
    TRACE_TYPE_COLORS[type] ?? "text-gray-500 bg-gray-500/10 border-gray-500/30";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium font-mono",
        colorClass
      )}
    >
      {type}
    </span>
  );
}
