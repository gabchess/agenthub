"use client";

import { useWorkflows } from "@/lib/hooks/use-workflows";
import { useGuardrails } from "@/lib/hooks/use-guardrails";
import { useAgentXp } from "@/lib/hooks/use-agent-xp";
import { AgentCard } from "./agent-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { AgentRole } from "@/lib/types";

export function AgentGrid() {
  const { workflows, isLoading: wfLoading } = useWorkflows();
  const { guardrails, isLoading: grLoading } = useGuardrails();
  const { agentXp, isLoading: xpLoading } = useAgentXp();

  const isLoading = wfLoading || grLoading || xpLoading;

  // Collect unique agents from all workflows
  const agentMap = new Map<
    string,
    { id: string; name?: string; role?: AgentRole; stepsAssigned: string[] }
  >();

  for (const wf of workflows) {
    // Build a lookup from agent ID to agent metadata (name, role)
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
        // Fill in name/role if not already set
        if (!existing.name && meta?.name) existing.name = meta.name;
        if (!existing.role && meta?.role) existing.role = meta.role;
      } else {
        agentMap.set(step.agent, {
          id: step.agent,
          name: meta?.name,
          role: meta?.role,
          stepsAssigned: [step.id],
        });
      }
    }
  }

  const agents = Array.from(agentMap.values());
  const guardrailMap = new Map(guardrails.map((g) => [g.agent_id, g]));

  // Map XP records by archetype for matching against agent IDs
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => {
        // Extract archetype from agent ID (e.g., "org/scout" -> "scout")
        const archetype = agent.id.split("/").pop() ?? agent.id;
        return (
          <AgentCard
            key={agent.id}
            agent={agent}
            guardrail={guardrailMap.get(agent.id)}
            xp={xpMap.get(archetype)}
          />
        );
      })}
    </div>
  );
}
