"use client";

import type { Run } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { StepCard } from "./step-card";
import { StoryProgress } from "./story-progress";
import { useStories } from "@/lib/hooks/use-stories";
import { useTraces } from "@/lib/hooks/use-traces";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { TraceTypeBadge } from "@/components/ui/trace-type-badge";
import { formatTimestamp, formatDuration, formatTokens } from "@/lib/utils";
import { relativeTime, formatFullTimestamp } from "@/lib/utils";
import type { TraceType } from "@/lib/types";

export function RunDetail({ run }: { run: Run }) {
  const { stories } = useStories(run.id);
  const { traces } = useTraces({ run_id: run.id, limit: 50 });
  const { workflows } = useWorkflows();

  const workflow = workflows.find((w) => w.id === run.workflow_id);
  const agentMap = new Map(
    (workflow?.agents ?? []).map((a) => [a.id, { name: a.name, role: a.role }])
  );

  const completedSteps = run.steps?.filter((s) => s.status === "done").length ?? 0;
  const totalSteps = run.steps?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Run header */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-accent-green font-mono text-sm font-medium">
              {run.id.slice(0, 12)}
            </h2>
            <StatusBadge status={run.status} variant="run" />
          </div>
          <span className="text-gray-500 text-xs">
            {formatFullTimestamp(run.created_at)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Workflow</span>
            <p className="text-gray-300 font-mono mt-0.5">{run.workflow_id}</p>
          </div>
          <div>
            <span className="text-gray-500">Task</span>
            <p className="text-gray-300 mt-0.5">{run.task}</p>
          </div>
          <div>
            <span className="text-gray-500">Steps</span>
            <p className="text-gray-300 font-mono mt-0.5">
              {completedSteps}/{totalSteps} completed
            </p>
          </div>
        </div>
      </div>

      {/* Stories */}
      <StoryProgress stories={stories} />

      {/* Step pipeline */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Step Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {run.steps?.map((step) => {
            const agent = agentMap.get(step.agent_id);
            return (
              <StepCard
                key={step.id}
                step={step}
                isActive={step.status === "running"}
                agentName={agent?.name}
                agentRole={agent?.role}
              />
            );
          })}
        </div>
      </div>

      {/* Embedded traces */}
      {traces.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Recent Traces
          </h3>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left py-2 px-3 font-medium">Time</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Agent</th>
                  <th className="text-left py-2 px-3 font-medium">Tokens</th>
                  <th className="text-left py-2 px-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {traces.slice(0, 20).map((trace) => (
                  <tr
                    key={trace.id}
                    className="border-b border-border/30 hover:bg-raised/30"
                  >
                    <td className="py-1.5 px-3 text-gray-500 font-mono">
                      {formatTimestamp(trace.timestamp)}
                    </td>
                    <td className="py-1.5 px-3">
                      <TraceTypeBadge type={trace.trace_type as TraceType} />
                    </td>
                    <td className="py-1.5 px-3 text-accent-cyan font-mono">
                      {trace.agent_id || "—"}
                    </td>
                    <td className="py-1.5 px-3 text-gray-400 font-mono">
                      {trace.input_tokens || trace.output_tokens
                        ? `${formatTokens(trace.input_tokens)}/${formatTokens(trace.output_tokens)}`
                        : "—"}
                    </td>
                    <td className="py-1.5 px-3 text-gray-400 font-mono">
                      {formatDuration(trace.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
