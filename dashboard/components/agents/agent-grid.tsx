"use client";

import { useWorkflows } from "@/lib/hooks/use-workflows";
import { useGuardrails } from "@/lib/hooks/use-guardrails";
import { AgentCard } from "./agent-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { AgentRole } from "@/lib/types";

export function AgentGrid() {
  const { workflows, isLoading: wfLoading } = useWorkflows();
  const { guardrails, isLoading: grLoading } = useGuardrails();

  const isLoading = wfLoading || grLoading;

  // Collect unique agents from all workflows
  const agentMap = new Map<
    string,
    { id: string; name?: string; role?: AgentRole; stepsAssigned: string[] }
  >();

  for (const wf of workflows) {
    for (const step of wf.steps) {
      const existing = agentMap.get(step.agent);
      if (existing) {
        if (!existing.stepsAssigned.includes(step.id)) {
          existing.stepsAssigned.push(step.id);
        }
      } else {
        agentMap.set(step.agent, {
          id: step.agent,
          stepsAssigned: [step.id],
        });
      }
    }
  }

  const agents = Array.from(agentMap.values());
  const guardrailMap = new Map(guardrails.map((g) => [g.agent_id, g]));

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
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          guardrail={guardrailMap.get(agent.id)}
        />
      ))}
    </div>
  );
}
