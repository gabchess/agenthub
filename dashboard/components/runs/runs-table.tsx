"use client";

import Link from "next/link";
import type { Run } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { relativeTime, truncateText } from "@/lib/utils";

export function RunsTable({ runs }: { runs: Run[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-gray-500 text-[11px] uppercase tracking-wider">
            <th className="text-left py-3 px-4 font-medium">Run ID</th>
            <th className="text-left py-3 px-4 font-medium">Workflow</th>
            <th className="text-left py-3 px-4 font-medium">Task</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="text-left py-3 px-4 font-medium">Progress</th>
            <th className="text-left py-3 px-4 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const completedSteps = run.steps?.filter(
              (s) => s.status === "done"
            ).length ?? 0;
            const totalSteps = run.steps?.length ?? 0;

            return (
              <tr
                key={run.id}
                className="border-b border-border/50 hover:bg-raised/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-accent-green hover:text-glow-green font-mono text-xs"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                  {run.workflow_id}
                </td>
                <td className="py-3 px-4 text-gray-300 text-xs">
                  {truncateText(run.task, 60)}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={run.status} variant="run" />
                </td>
                <td className="py-3 px-4 w-32">
                  <ProgressBar value={completedSteps} max={totalSteps} />
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">
                  {relativeTime(run.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
