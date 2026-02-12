"use client";

import type { Trace, TraceType } from "@/lib/types";
import { TraceTypeBadge } from "@/components/ui/trace-type-badge";
import { formatFullTimestamp, formatDuration, formatTokens, parseJsonSafe } from "@/lib/utils";

interface TraceDetailModalProps {
  trace: Trace;
  onClose: () => void;
}

export function TraceDetailModal({ trace, onClose }: TraceDetailModalProps) {
  const data = parseJsonSafe(trace.data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-raised border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <TraceTypeBadge type={trace.trace_type as TraceType} />
            <span className="text-xs text-gray-500 font-mono">
              {trace.id.slice(0, 12)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata */}
        <div className="p-4 border-b border-border grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Timestamp</span>
            <p className="text-gray-300 font-mono mt-0.5">
              {formatFullTimestamp(trace.timestamp)}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Agent</span>
            <p className="text-accent-cyan font-mono mt-0.5">
              {trace.agent_id || "—"}
            </p>
          </div>
          {trace.model && (
            <div>
              <span className="text-gray-500">Model</span>
              <p className="text-gray-300 font-mono mt-0.5">{trace.model}</p>
            </div>
          )}
          {trace.duration_ms && (
            <div>
              <span className="text-gray-500">Duration</span>
              <p className="text-gray-300 font-mono mt-0.5">
                {formatDuration(trace.duration_ms)}
              </p>
            </div>
          )}
          {(trace.input_tokens || trace.output_tokens) && (
            <div>
              <span className="text-gray-500">Tokens</span>
              <p className="text-gray-300 font-mono mt-0.5">
                {formatTokens(trace.input_tokens)} in / {formatTokens(trace.output_tokens)} out
              </p>
            </div>
          )}
          {trace.run_id && (
            <div>
              <span className="text-gray-500">Run</span>
              <p className="text-gray-300 font-mono mt-0.5">
                {trace.run_id.slice(0, 12)}
              </p>
            </div>
          )}
        </div>

        {/* Data JSON */}
        <div className="p-4 overflow-auto max-h-80">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">
            Data
          </span>
          <pre className="text-[11px] text-gray-400 font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
