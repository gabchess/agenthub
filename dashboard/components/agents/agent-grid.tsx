"use client";

import { useState } from "react";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { useGuardrails } from "@/lib/hooks/use-guardrails";
import { useAgentXp } from "@/lib/hooks/use-agent-xp";
import { useRuns } from "@/lib/hooks/use-runs";
import { AgentCard } from "./agent-card";
import { RpgAgentCard } from "./rpg-agent-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";
import type { AgentRole } from "@/lib/types";

export function AgentGrid() {
  const [viewMode, setViewMode] = useState<"rpg" | "classic">("rpg");
  const { workflows, isLoading: wfLoading } = useWorkflows();
  const { guardrails, isLoading: grLoading } = useGuardrails();
  const { agentXp, isLoading: xpLoading } = useAgentXp();
  const { runs } = useRuns();

  const isLoading = wfLoading || grLoading || xpLoading;

  // Collect unique agents from all workflows
  const agentMap = new Map<
    string,
    { id: string; name?: string; role?: AgentRole; stepsAssigned: string[]; totalRuns: number; lastActive?: string }
  >();

  for (const wf of workflows) {
    const wfAgentMeta = new Map(
      (wf.agents ?? []).map((a) => [a.id, { name: a.name, role: a.role as AgentRole }])
    );

    for (const step of wf.steps) {
      const existing = agentMap.get(step.agent);
      const meta = wfAgentMeta.get(step.agent);
      if (existing) {
        if (!existing.stepsAssigned.includes(step.id)) {
          existing.stepsAssigned.push(step.id);
        }
        if (!existing.name && meta?.name) existing.name = meta.name;
        if (!existing.role && meta?.role) existing.role = meta.role;
      } else {
        agentMap.set(step.agent, {
          id: step.agent,
          name: meta?.name,
          role: meta?.role,
          stepsAssigned: [step.id],
          totalRuns: 0,
        });
      }
    }
  }

  // Calculate runs per agent and last active time
  for (const run of runs) {
    if (!run.steps) continue;
    const seenAgents = new Set<string>();
    for (const step of run.steps) {
      const agent = agentMap.get(step.agent_id);
      if (agent && !seenAgents.has(step.agent_id)) {
        agent.totalRuns++;
        seenAgents.add(step.agent_id);
      }
      if (agent) {
        const stepTime = step.updated_at || step.created_at;
        if (!agent.lastActive || stepTime > agent.lastActive) {
          agent.lastActive = stepTime;
        }
      }
    }
  }

  const agents = Array.from(agentMap.values());
  const guardrailMap = new Map(guardrails.map((g) => [g.agent_id, g]));
  const xpMap = new Map(agentXp.map((xp) => [xp.agent_archetype, xp]));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return <EmptyState message="No agents found in workflow definitions" />;
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono">
          <span>{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
          <span className="text-gray-700">|</span>
          <span>{agentXp.filter((a) => a.level >= 3).length} veteran+</span>
          <span className="text-gray-700">|</span>
          <span>{agentXp.reduce((s, a) => s + a.steps_completed, 0)} total steps</span>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("rpg")}
            className={clsx(
              "px-2.5 py-1 rounded text-[10px] font-mono transition-colors",
              viewMode === "rpg"
                ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/30"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            RPG Cards
          </button>
          <button
            onClick={() => setViewMode("classic")}
            className={clsx(
              "px-2.5 py-1 rounded text-[10px] font-mono transition-colors",
              viewMode === "classic"
                ? "bg-accent-green/15 text-accent-green border border-accent-green/30"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Classic
          </button>
        </div>
      </div>

      {/* Card grid */}
      <div className={clsx(
        "grid gap-4",
        viewMode === "rpg"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {agents.map((agent) => {
          const archetype = agent.id.split("/").pop() ?? agent.id;
          const agentXpData = xpMap.get(archetype);
          const agentGuardrail = guardrailMap.get(agent.id);

          return viewMode === "rpg" ? (
            <RpgAgentCard
              key={agent.id}
              agent={agent}
              guardrail={agentGuardrail}
              xp={agentXpData}
            />
          ) : (
            <AgentCard
              key={agent.id}
              agent={agent}
              guardrail={agentGuardrail}
              xp={agentXpData}
            />
          );
        })}
      </div>
    </div>
  );
}
