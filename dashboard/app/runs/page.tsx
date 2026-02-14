"use client";

import { useRuns } from "@/lib/hooks/use-runs";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { RunsTable } from "@/components/runs/runs-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import type { RunStatus } from "@/lib/types";

type SortKey = "created" | "status" | "workflow";
type SortDir = "asc" | "desc";

const STATUS_FILTERS: { label: string; value: RunStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Paused", value: "paused" },
  { label: "Blocked", value: "blocked" },
];

export default function RunsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<RunStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { runs, isLoading } = useRuns(selectedWorkflow);
  const { workflows } = useWorkflows();

  const filteredAndSorted = useMemo(() => {
    let result = statusFilter === "all"
      ? runs
      : runs.filter((r) => r.status === statusFilter);

    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "created":
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "workflow":
          return a.workflow_id.localeCompare(b.workflow_id) * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [runs, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Workflow filter */}
        {workflows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
              Workflow
            </span>
            <button
              onClick={() => setSelectedWorkflow(undefined)}
              className={clsx(
                "px-2.5 py-1 rounded text-xs font-mono transition-colors",
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
                  "px-2.5 py-1 rounded text-xs font-mono transition-colors",
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

        {/* Divider */}
        {workflows.length > 0 && (
          <div className="w-px h-5 bg-border" />
        )}

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">
            Status
          </span>
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={clsx(
                "px-2.5 py-1 rounded text-xs font-mono transition-colors",
                statusFilter === sf.value
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
                  : "text-gray-500 hover:text-gray-300 border border-border"
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">
            Sort
          </span>
          {(["created", "status", "workflow"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={clsx(
                "px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1",
                sortKey === key
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                  : "text-gray-500 hover:text-gray-300 border border-border"
              )}
            >
              {key}
              {sortKey === key && (
                <span className="text-[10px]">
                  {sortDir === "desc" ? "\u2193" : "\u2191"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500 font-mono">
          {filteredAndSorted.length} run{filteredAndSorted.length !== 1 ? "s" : ""}
          {statusFilter !== "all" && ` (${statusFilter})`}
        </span>
      </div>

      {/* Runs list */}
      <ErrorBoundary>
        <div className="bg-surface border border-border rounded-lg">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <EmptyState message="No workflow runs found. Start a workflow to see runs here." />
          ) : (
            <RunsTable runs={filteredAndSorted} />
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
