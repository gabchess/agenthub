"use client";

import { GlowCard } from "@/components/ui/glow-card";
import { RoleBadge } from "@/components/ui/role-badge";
import { GuardrailsSummary } from "./guardrails-summary";
import type { AgentRole, Guardrail } from "@/lib/types";

interface AgentInfo {
  id: string;
  name?: string;
  role?: AgentRole;
  stepsAssigned: string[];
}

export function AgentCard({
  agent,
  guardrail,
}: {
  agent: AgentInfo;
  guardrail?: Guardrail;
}) {
  return (
    <GlowCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">
          {agent.name || agent.id}
        </h3>
        {agent.role && <RoleBadge role={agent.role} />}
      </div>

      <div className="text-[11px] text-gray-500 font-mono">
        ID: {agent.id}
      </div>

      {agent.stepsAssigned.length > 0 && (
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            Steps
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {agent.stepsAssigned.map((stepId) => (
              <span
                key={stepId}
                className="px-1.5 py-0.5 bg-raised border border-border rounded text-[10px] text-gray-400 font-mono"
              >
                {stepId}
              </span>
            ))}
          </div>
        </div>
      )}

      {guardrail && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">
            Guardrails
          </span>
          <GuardrailsSummary guardrail={guardrail} />
        </div>
      )}
    </GlowCard>
  );
}
