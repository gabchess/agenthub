"use client";

import { AgentGrid } from "@/components/agents/agent-grid";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AgentGrid />
    </ErrorBoundary>
  );
}
