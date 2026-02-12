"use client";

import { clsx } from "clsx";

interface CollectorStatus {
  source: string;
  status: string;
  last_poll_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  error_count: number;
  success_count: number;
  records_ingested: number;
  avg_duration_ms: number | null;
}

function timeSince(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 1000) return "just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60000)}m ago`;
}

export function PipelineHealthBar({ statuses }: { statuses: CollectorStatus[] }) {
  if (statuses.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="w-2 h-2 rounded-full bg-gray-600" />
        Pipeline not running
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => {
        const isRunning = s.status === "running";
        const isError = s.status === "error";

        return (
          <div
            key={s.source}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded border text-xs",
              isRunning && "border-accent-green/30 bg-accent-green/5",
              isError && "border-accent-red/30 bg-accent-red/5",
              !isRunning && !isError && "border-border bg-surface"
            )}
          >
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                isRunning && "bg-accent-green animate-pulse",
                isError && "bg-accent-red",
                !isRunning && !isError && "bg-gray-600"
              )}
            />
            <span className="text-gray-300 font-medium">{s.source}</span>
            <span className="text-gray-600">{s.records_ingested.toLocaleString()} rec</span>
            <span className="text-gray-600">{timeSince(s.last_poll_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
