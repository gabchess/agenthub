"use client";

import { useRuns } from "@/lib/hooks/use-runs";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { RunsTable } from "@/components/runs/runs-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useState } from "react";
import { clsx } from "clsx";

export default function RunsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>();
  const { runs, isLoading } = useRuns(selectedWorkflow);
  const { workflows } = useWorkflows();

  return (
    <div className="space-y-4">
      {/* Workflow filter */}
      {workflows.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 uppercase tracking-wider">
            Filter:
          </span>
          <button
            onClick={() => setSelectedWorkflow(undefined)}
            className={clsx(
              "px-3 py-1 rounded text-xs font-mono transition-colors",
              !selectedWorkflow
                ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
                : "text-gray-500 hover:text-gray-300 border border-border"
            )}
          >
            All
          </button>
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => setSelectedWorkflow(wf.id)}
              className={clsx(
                "px-3 py-1 rounded text-xs font-mono transition-colors",
                selectedWorkflow === wf.id
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
                  : "text-gray-500 hover:text-gray-300 border border-border"
              )}
            >
              {wf.name || wf.id}
            </button>
          ))}
        </div>
      )}

      {/* Runs list */}
      <ErrorBoundary>
        <div className="bg-surface border border-border rounded-lg">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : runs.length === 0 ? (
            <EmptyState message="No workflow runs found. Start a workflow to see runs here." />
          ) : (
            <RunsTable runs={runs} />
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
