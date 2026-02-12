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
  poll_interval_ms: number;
  avg_duration_ms: number | null;
  records_ingested: number;
}

export function IngestionStats({ statuses }: { statuses: CollectorStatus[] }) {
  const totalRecords = statuses.reduce((sum, s) => sum + s.records_ingested, 0);
  const totalErrors = statuses.reduce((sum, s) => sum + s.error_count, 0);

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs font-mono">
        <span className="text-gray-500">
          Total records: <span className="text-accent-green">{totalRecords.toLocaleString()}</span>
        </span>
        <span className="text-gray-500">
          Total errors: <span className={clsx(totalErrors > 0 ? "text-accent-red" : "text-gray-400")}>{totalErrors}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-gray-600 border-b border-border">
              <th className="text-left py-2 px-3">Source</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Interval</th>
              <th className="text-right py-2 px-3">Avg Duration</th>
              <th className="text-right py-2 px-3">Records</th>
              <th className="text-right py-2 px-3">Errors</th>
              <th className="text-left py-2 px-3">Last Error</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.source} className="border-b border-border/50 hover:bg-raised/50">
                <td className="py-2 px-3 text-gray-300 font-medium">{s.source}</td>
                <td className="py-2 px-3">
                  <span
                    className={clsx(
                      "px-1.5 py-0.5 rounded",
                      s.status === "running" && "text-accent-green bg-accent-green/10",
                      s.status === "error" && "text-accent-red bg-accent-red/10",
                      s.status === "idle" && "text-gray-500 bg-gray-500/10",
                      s.status === "stopped" && "text-accent-amber bg-accent-amber/10"
                    )}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-gray-500">{(s.poll_interval_ms / 1000).toFixed(0)}s</td>
                <td className="py-2 px-3 text-right text-gray-500">
                  {s.avg_duration_ms !== null ? `${s.avg_duration_ms}ms` : "—"}
                </td>
                <td className="py-2 px-3 text-right text-accent-green">{s.records_ingested.toLocaleString()}</td>
                <td className={clsx("py-2 px-3 text-right", s.error_count > 0 ? "text-accent-red" : "text-gray-600")}>
                  {s.error_count}
                </td>
                <td className="py-2 px-3 text-gray-600 max-w-[200px] truncate">
                  {s.last_error ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
