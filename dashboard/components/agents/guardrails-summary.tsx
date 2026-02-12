"use client";

import type { Guardrail } from "@/lib/types";
import { parseJsonSafe } from "@/lib/utils";

export function GuardrailsSummary({ guardrail }: { guardrail: Guardrail }) {
  const allowlist = guardrail.tool_allowlist
    ? JSON.parse(guardrail.tool_allowlist)
    : [];
  const denylist = guardrail.tool_denylist
    ? JSON.parse(guardrail.tool_denylist)
    : [];

  return (
    <div className="space-y-2 text-[11px]">
      {allowlist.length > 0 && (
        <div>
          <span className="text-gray-500">Allowed tools:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {allowlist.map((tool: string) => (
              <span
                key={tool}
                className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-[10px] font-mono"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {denylist.length > 0 && (
        <div>
          <span className="text-gray-500">Denied tools:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {denylist.map((tool: string) => (
              <span
                key={tool}
                className="px-1.5 py-0.5 bg-accent-red/10 text-accent-red border border-accent-red/20 rounded text-[10px] font-mono"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {guardrail.max_spend_per_tx && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Max spend/tx:</span>
          <span className="text-accent-amber font-mono">
            {guardrail.max_spend_per_tx}
          </span>
        </div>
      )}

      {guardrail.approval_threshold && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Approval threshold:</span>
          <span className="text-accent-amber font-mono">
            {guardrail.approval_threshold}
          </span>
        </div>
      )}

      {guardrail.require_simulation && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Simulation required:</span>
          <span className="text-accent-green">Yes</span>
        </div>
      )}
    </div>
  );
}
