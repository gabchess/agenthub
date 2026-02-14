"use client";

import { useState, useEffect } from "react";
import type { Run, TraceType } from "@/lib/types";
import { clsx } from "clsx";
import { StatusBadge } from "@/components/ui/status-badge";
import { StepCard } from "./step-card";
import { StoryProgress } from "./story-progress";
import { useStories } from "@/lib/hooks/use-stories";
import { useTraces } from "@/lib/hooks/use-traces";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { TraceTypeBadge } from "@/components/ui/trace-type-badge";
import { formatTimestamp, formatDuration, formatTokens } from "@/lib/utils";
import { relativeTime, formatFullTimestamp } from "@/lib/utils";

function useRunDuration(run: Run) {
  const isRunning = run.status === "running";
  const [elapsed, setElapsed] = useState<number>(() => {
    const start = new Date(run.created_at).getTime();
    const end = isRunning ? Date.now() : new Date(run.updated_at).getTime();
    return end - start;
  });

  useEffect(() => {
    if (!isRunning) {
      const start = new Date(run.created_at).getTime();
      const end = new Date(run.updated_at).getTime();
      setElapsed(end - start);
      return;
    }

    const start = new Date(run.created_at).getTime();
    setElapsed(Date.now() - start);

    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [run.created_at, run.updated_at, isRunning]);

  return { elapsed, isRunning };
}

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-gray-500 hover:text-accent-cyan transition-colors p-0.5"
      title="Copy"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function TimelineStep({ step, index, total, agentName, agentRole }: {
  step: Run["steps"][number];
  index: number;
  total: number;
  agentName?: string;
  agentRole?: string;
}) {
  const isLast = index === total - 1;
  const statusColor = {
    waiting: "border-gray-600 bg-gray-600/20",
    running: "border-accent-green bg-accent-green/20 animate-pulse",
    done: "border-accent-green bg-accent-green",
    failed: "border-accent-red bg-accent-red",
    blocked: "border-accent-amber bg-accent-amber/20",
  }[step.status] ?? "border-gray-600 bg-gray-600/20";

  const lineColor: string = ({
    waiting: "bg-border",
    running: "bg-accent-green/20",
    done: "bg-accent-green/40",
    failed: "bg-accent-red/40",
    blocked: "bg-accent-amber/20",
  } as Record<string, string>)[step.status] ?? "bg-border";

  return (
    <div className="flex gap-3">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className={clsx("w-3 h-3 rounded-full border-2 shrink-0", statusColor)} />
        {!isLast && <div className={clsx("w-0.5 flex-1 min-h-[20px]", lineColor)} />}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-4 min-w-0">
        <StepCard
          step={step}
          isActive={step.status === "running"}
          agentName={agentName}
          agentRole={agentRole}
        />
      </div>
    </div>
  );
}

export function RunDetail({ run }: { run: Run }) {
  const { stories } = useStories(run.id);
  const { traces } = useTraces({ run_id: run.id, limit: 50 });
  const { workflows } = useWorkflows();
  const { elapsed, isRunning } = useRunDuration(run);

  const workflow = workflows.find((w) => w.id === run.workflow_id);
  const agentMap = new Map(
    (workflow?.agents ?? []).map((a) => [a.id, { name: a.name, role: a.role }])
  );

  const completedSteps = run.steps?.filter((s) => s.status === "done").length ?? 0;
  const totalSteps = run.steps?.length ?? 0;
  const failedSteps = run.steps?.filter((s) => s.status === "failed").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Run header */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-accent-green font-mono text-sm font-medium text-glow-green">
              {run.id.slice(0, 12)}
            </h2>
            <StatusBadge status={run.status} variant="run" />
            <span className={clsx(
              "text-sm flex items-center gap-1 font-mono",
              isRunning ? "text-accent-green" : "text-gray-400"
            )}>
              {formatDuration(elapsed)}
            </span>
          </div>
          <span className="text-gray-500 text-xs font-mono">
            {formatFullTimestamp(run.created_at)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Workflow</span>
            <p className="text-gray-300 font-mono mt-0.5">{run.workflow_id}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Task</span>
            <p className="text-gray-300 mt-0.5">{run.task}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Progress</span>
            <p className="text-gray-300 font-mono mt-0.5">
              <span className="text-accent-green">{completedSteps}</span>
              {failedSteps > 0 && <span className="text-accent-red"> / {failedSteps} failed</span>}
              <span className="text-gray-500"> / {totalSteps} steps</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Duration</span>
            <p className={clsx("font-mono mt-0.5", isRunning ? "text-accent-green" : "text-gray-300")}>
              {formatDuration(elapsed)}
              {isRunning && <span className="ml-1 text-[10px] text-accent-green/60">(live)</span>}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full h-1.5 bg-raised rounded-full overflow-hidden flex">
            {totalSteps > 0 && (
              <>
                <div
                  className="h-full bg-accent-green rounded-l-full transition-all duration-500"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                />
                {failedSteps > 0 && (
                  <div
                    className="h-full bg-accent-red transition-all duration-500"
                    style={{ width: `${(failedSteps / totalSteps) * 100}%` }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trace commitment */}
      {run.trace_hash && (
        <div className="bg-surface border border-accent-purple/30 rounded-lg p-4 glow-purple">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent-purple text-sm">&#9830;</span>
            <h3 className="text-sm font-medium text-accent-purple">
              On-Chain Trace Commitment
            </h3>
            <span className={clsx(
              "ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium uppercase tracking-wider",
              run.trace_tx_hash
                ? "text-accent-green bg-accent-green/10 border-accent-green/30"
                : "text-accent-amber bg-accent-amber/10 border-accent-amber/30"
            )}>
              {run.trace_tx_hash ? "settled" : "hash only"}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20 shrink-0">Trace Hash</span>
              <code className="text-accent-cyan font-mono bg-raised px-2 py-0.5 rounded text-[11px] truncate">
                {run.trace_hash}
              </code>
              <CopyInline text={run.trace_hash} />
            </div>
            {run.trace_tx_hash && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-20 shrink-0">TX Hash</span>
                <a
                  href={`https://explorer.testnet.monad.xyz/tx/${run.trace_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-green font-mono bg-raised px-2 py-0.5 rounded text-[11px] truncate hover:text-accent-green/80 hover:underline transition-colors"
                >
                  {run.trace_tx_hash}
                </a>
                <CopyInline text={run.trace_tx_hash} />
                <a
                  href={`https://explorer.testnet.monad.xyz/tx/${run.trace_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-green text-[10px] hover:underline shrink-0"
                >
                  Explorer &#8599;
                </a>
              </div>
            )}
            {run.trace_committed_at && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-20 shrink-0">Committed</span>
                <span className="text-gray-400 font-mono text-[11px]">
                  {formatFullTimestamp(run.trace_committed_at)}
                </span>
                <span className="text-gray-600 text-[10px]">
                  ({relativeTime(run.trace_committed_at)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stories */}
      <StoryProgress stories={stories} />

      {/* Step pipeline — CI/CD Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Step Pipeline</h3>
          <span className="text-[11px] text-gray-500 font-mono">
            {completedSteps}/{totalSteps} complete
          </span>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          {run.steps?.map((step, i) => {
            const agent = agentMap.get(step.agent_id);
            return (
              <TimelineStep
                key={step.id}
                step={step}
                index={i}
                total={run.steps?.length ?? 0}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">
              Recent Traces
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              {traces.length} trace{traces.length !== 1 ? "s" : ""}
            </span>
          </div>
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
                    className="border-b border-border/30 hover:bg-raised/30 transition-colors"
                  >
                    <td className="py-1.5 px-3 text-gray-500 font-mono">
                      {formatTimestamp(trace.timestamp)}
                    </td>
                    <td className="py-1.5 px-3">
                      <TraceTypeBadge type={trace.trace_type as TraceType} />
                    </td>
                    <td className="py-1.5 px-3 text-accent-cyan font-mono">
                      {trace.agent_id || "\u2014"}
                    </td>
                    <td className="py-1.5 px-3 text-gray-400 font-mono">
                      {trace.input_tokens || trace.output_tokens
                        ? `${formatTokens(trace.input_tokens)}/${formatTokens(trace.output_tokens)}`
                        : "\u2014"}
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
