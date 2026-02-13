"use client";

import type { Step, AgentRole } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { clsx } from "clsx";

export function StepCard({ step, isActive, agentName, agentRole }: { step: Step; isActive?: boolean; agentName?: string; agentRole?: string }) {
  return (
    <div
      className={clsx(
        "bg-surface border rounded-lg p-3 transition-all",
        isActive
          ? "border-accent-green/30 glow-green"
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

      {step.output && (
        <div className="mt-2 text-[11px] text-gray-500 line-clamp-2 font-mono">
          {step.output.slice(0, 120)}
          {step.output.length > 120 && "..."}
        </div>
      )}
    </div>
  );
}
