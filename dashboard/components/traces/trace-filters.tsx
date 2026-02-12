"use client";

import { clsx } from "clsx";
import type { TraceType } from "@/lib/types";

const TRACE_TYPES: TraceType[] = [
  "step.claim",
  "step.complete",
  "step.fail",
  "model.request",
  "model.response",
  "tool.call",
  "tool.result",
  "guardrail.check",
  "guardrail.block",
  "approval.request",
  "approval.granted",
  "wallet.tx",
  "state.read",
  "state.write",
];

interface TraceFiltersProps {
  runId: string;
  onRunIdChange: (v: string) => void;
  agentId: string;
  onAgentIdChange: (v: string) => void;
  traceType: string;
  onTraceTypeChange: (v: string) => void;
}

export function TraceFilters({
  runId,
  onRunIdChange,
  agentId,
  onAgentIdChange,
  traceType,
  onTraceTypeChange,
}: TraceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider">
          Run
        </label>
        <input
          type="text"
          value={runId}
          onChange={(e) => onRunIdChange(e.target.value)}
          placeholder="run-id..."
          className="bg-raised border border-border rounded px-2 py-1 text-xs font-mono text-gray-300 placeholder-gray-600 w-36 focus:outline-none focus:border-accent-green/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider">
          Agent
        </label>
        <input
          type="text"
          value={agentId}
          onChange={(e) => onAgentIdChange(e.target.value)}
          placeholder="agent-id..."
          className="bg-raised border border-border rounded px-2 py-1 text-xs font-mono text-gray-300 placeholder-gray-600 w-36 focus:outline-none focus:border-accent-green/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider">
          Type
        </label>
        <select
          value={traceType}
          onChange={(e) => onTraceTypeChange(e.target.value)}
          className="bg-raised border border-border rounded px-2 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-accent-green/50"
        >
          <option value="">All types</option>
          {TRACE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {(runId || agentId || traceType) && (
        <button
          onClick={() => {
            onRunIdChange("");
            onAgentIdChange("");
            onTraceTypeChange("");
          }}
          className="text-[10px] text-gray-500 hover:text-accent-red transition-colors uppercase tracking-wider"
        >
          Clear
        </button>
      )}
    </div>
  );
}
