"use client";

import { useState, useRef, useEffect } from "react";
import { useTraces } from "@/lib/hooks/use-traces";
import { TraceFilters } from "./trace-filters";
import { TraceRow } from "./trace-row";
import { TraceDetailModal } from "./trace-detail-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import type { Trace } from "@/lib/types";

export function TraceViewer() {
  const [runId, setRunId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [traceType, setTraceType] = useState("");
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const { traces, isLoading } = useTraces({
    run_id: runId || undefined,
    agent_id: agentId || undefined,
    trace_type: traceType || undefined,
    limit: 200,
  });

  // Auto-scroll to bottom when new traces arrive
  useEffect(() => {
    if (autoScroll && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [traces, autoScroll]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TraceFilters
          runId={runId}
          onRunIdChange={setRunId}
          agentId={agentId}
          onAgentIdChange={setAgentId}
          traceType={traceType}
          onTraceTypeChange={setTraceType}
        />
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">
            Auto-scroll
          </label>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`w-8 h-4 rounded-full transition-colors ${
              autoScroll ? "bg-accent-green/30" : "bg-raised"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full transition-all ${
                autoScroll
                  ? "bg-accent-green translate-x-4"
                  : "bg-gray-500 translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={10} />
          </div>
        ) : traces.length === 0 ? (
          <EmptyState message="No traces found" />
        ) : (
          <div ref={tableRef} className="max-h-[calc(100vh-220px)] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left py-2 px-3 font-medium">Time</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Agent</th>
                  <th className="text-left py-2 px-3 font-medium">Step</th>
                  <th className="text-left py-2 px-3 font-medium">Model</th>
                  <th className="text-left py-2 px-3 font-medium">Tokens</th>
                  <th className="text-left py-2 px-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((trace) => (
                  <TraceRow
                    key={trace.id}
                    trace={trace}
                    onClick={setSelectedTrace}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-600 font-mono">
            {traces.length} traces
          </span>
          <span className="text-[10px] text-gray-600">
            Polling every 2s
          </span>
        </div>
      </div>

      {selectedTrace && (
        <TraceDetailModal
          trace={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}
