"use client";

import { useState } from "react";
import type { Step, AgentRole } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { clsx } from "clsx";
import { formatDuration } from "@/lib/utils";

function highlightKeyValueLines(text: string) {
  return text.split("\n").map((line, i) => {
    const match = line.match(/^([A-Za-z_][\w\s]*?):\s(.+)$/);
    if (match) {
      return (
        <span key={i}>
          <span className="text-accent-green">{match[1]}:</span> {match[2]}
          {"\n"}
        </span>
      );
    }
    return <span key={i}>{line}{"\n"}</span>;
  });
}

export function StepCard({ step, isActive, agentName, agentRole }: { step: Step; isActive?: boolean; agentName?: string; agentRole?: string }) {
  const [expanded, setExpanded] = useState(false);

  const duration = step.updated_at && step.created_at
    ? new Date(step.updated_at).getTime() - new Date(step.created_at).getTime()
    : undefined;

  return (
    <div
      className={clsx(
        "bg-surface border rounded-lg p-3 transition-all",
        isActive
          ? "border-accent-green/30 glow-green"
          : step.status === "failed"
          ? "border-accent-red/20"
          : "border-border hover:border-border/80"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-[10px] font-mono">
            #{step.step_index}
          </span>
          <span className="text-gray-300 text-xs font-medium">
            {step.step_id}
          </span>
          {duration && step.status === "done" && (
            <span className="text-[10px] text-gray-600 font-mono">
              {formatDuration(duration)}
            </span>
          )}
        </div>
        <StatusBadge status={step.status} variant="step" />
      </div>

      {agentName && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-200 text-xs font-bold">{agentName}</span>
          {agentRole && <RoleBadge role={agentRole as AgentRole} />}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-gray-500">agent:</span>
        <span className="text-accent-cyan font-mono text-[10px]">{step.agent_id}</span>
      </div>

      {step.type !== "single" && (
        <div className="flex items-center gap-2 text-[11px] mt-1">
          <span className="text-gray-500">type:</span>
          <span className="text-accent-amber font-mono">{step.type}</span>
        </div>
      )}

      {step.parallel_group && (
        <div className="flex items-center gap-2 text-[11px] mt-1">
          <span className="text-gray-500">parallel:</span>
          <span className="text-accent-purple font-mono">
            {step.parallel_group}
          </span>
        </div>
      )}

      {step.retry_count > 0 && (
        <div className="flex items-center gap-2 text-[11px] mt-1">
          <span className="text-gray-500">retries:</span>
          <span className="text-accent-amber font-mono">
            {step.retry_count}/{step.max_retries}
          </span>
        </div>
      )}

      {step.output && (
        <div className="mt-2">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left group"
            >
              <div className="bg-page/50 rounded p-2 text-xs text-gray-400 font-mono border border-border/30">
                {step.output.slice(0, 200)}
                {step.output.length > 200 && (
                  <span className="text-accent-cyan ml-1 group-hover:underline">
                    ...expand
                  </span>
                )}
              </div>
            </button>
          ) : (
            <div>
              <button
                onClick={() => setExpanded(false)}
                className="text-[10px] text-accent-cyan hover:underline mb-1"
              >
                collapse
              </button>
              <pre className="bg-page/50 rounded p-2 text-xs text-gray-400 font-mono max-h-64 overflow-y-auto whitespace-pre-wrap break-words border border-border/30">
                {highlightKeyValueLines(step.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
