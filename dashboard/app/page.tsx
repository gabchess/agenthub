"use client";

import Link from "next/link";
import { useRuns } from "@/lib/hooks/use-runs";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { useAgentXp } from "@/lib/hooks/use-agent-xp";
import { clsx } from "clsx";

const NAV_CARDS = [
  {
    href: "/runs",
    title: "Workflow Runs",
    description: "Monitor live and historical workflow executions",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "accent-green",
    glowClass: "hover:glow-green hover:border-accent-green/30",
  },
  {
    href: "/agents",
    title: "Agent Cards",
    description: "View agent roles, XP levels, and guardrails",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    color: "accent-cyan",
    glowClass: "hover:glow-cyan hover:border-accent-cyan/30",
  },
  {
    href: "/traces",
    title: "Execution Traces",
    description: "Real-time trace stream with 14 trace types",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "accent-amber",
    glowClass: "hover:border-accent-amber/30",
  },
  {
    href: "/wallets",
    title: "Wallet Monitor",
    description: "Track agent wallets, balances, and transactions",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    color: "accent-purple",
    glowClass: "hover:glow-purple hover:border-accent-purple/30",
  },
  {
    href: "/pipeline",
    title: "Pipeline Health",
    description: "Block metrics, price feeds, and ingestion status",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    color: "accent-green",
    glowClass: "hover:glow-green hover:border-accent-green/30",
  },
];

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-border/80 transition-colors">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={clsx("text-2xl font-bold font-mono", `text-${color}`)}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-gray-500 mt-1 font-mono">{sub}</div>
      )}
    </div>
  );
}

export default function Home() {
  const { runs } = useRuns();
  const { workflows } = useWorkflows();
  const { agentXp } = useAgentXp();

  const activeRuns = runs.filter((r) => r.status === "running").length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const totalSteps = runs.reduce(
    (sum, r) => sum + (r.steps?.length ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-green/5 via-transparent to-accent-purple/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-accent-green shrink-0">
              <path d="M12 2L21.196 7.5V18.5L12 24L2.804 18.5V7.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
              <circle cx="12" cy="13" r="3" fill="currentColor" fillOpacity="0.6" />
              <line x1="12" y1="10" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9.4" y1="11.5" x2="5.5" y2="9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14.6" y1="14.5" x2="18.5" y2="16.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14.6" y1="11.5" x2="18.5" y2="9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9.4" y1="14.5" x2="5.5" y2="16.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <h1 className="text-2xl font-bold text-accent-green text-glow-green tracking-tight">
              AgentHub
            </h1>
          </div>
          <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
            AI agent orchestration platform for Monad. Framework-agnostic,
            crypto-native, observable by default.
          </p>
          <div className="mt-4 inline-block bg-page/80 rounded px-3 py-1.5 border border-border">
            <code className="text-xs text-gray-400">
              <span className="text-accent-green">$</span>{" "}
              <span className="text-gray-300">agenthub</span>{" "}
              <span className="text-accent-cyan">run</span>{" "}
              <span className="text-gray-500">--workflow token-monitor</span>
              <span className="text-accent-green animate-pulse">_</span>
            </code>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Runs"
          value={runs.length}
          sub={activeRuns > 0 ? `${activeRuns} active` : `${completedRuns} completed`}
          color="accent-green"
        />
        <StatCard
          label="Agents"
          value={agentXp.length}
          sub={agentXp.length > 0 ? `${agentXp.filter((a) => a.level >= 3).length} veteran+` : undefined}
          color="accent-cyan"
        />
        <StatCard
          label="Workflows"
          value={workflows.length}
          sub="registered"
          color="accent-amber"
        />
        <StatCard
          label="Steps Executed"
          value={totalSteps}
          sub={runs.length > 0 ? `~${(totalSteps / runs.length).toFixed(1)}/run` : undefined}
          color="accent-purple"
        />
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Quick Navigation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={clsx(
                "group bg-surface border border-border rounded-lg p-4 transition-all duration-200",
                card.glowClass
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    "p-2 rounded-lg border transition-colors",
                    `text-${card.color} bg-${card.color}/10 border-${card.color}/20`,
                    `group-hover:bg-${card.color}/20`
                  )}
                >
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Runs Preview */}
      {runs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">
              Recent Activity
            </h2>
            <Link
              href="/runs"
              className="text-[11px] text-accent-green hover:underline"
            >
              View all runs
            </Link>
          </div>
          <div className="bg-surface border border-border rounded-lg divide-y divide-border/50">
            {runs.slice(0, 5).map((run) => {
              const done = run.steps?.filter((s) => s.status === "done").length ?? 0;
              const total = run.steps?.length ?? 0;
              return (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-raised/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={clsx(
                        "w-2 h-2 rounded-full shrink-0",
                        run.status === "running" && "bg-accent-green animate-pulse",
                        run.status === "completed" && "bg-gray-500",
                        run.status === "paused" && "bg-accent-amber",
                        run.status === "blocked" && "bg-accent-red",
                        run.status === "canceled" && "bg-gray-600"
                      )}
                    />
                    <span className="text-accent-green font-mono text-xs group-hover:text-glow-green transition-all">
                      {run.id.slice(0, 8)}
                    </span>
                    <span className="text-gray-500 text-xs truncate">
                      {run.workflow_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[11px] text-gray-500 font-mono">
                      {done}/{total}
                    </span>
                    <span
                      className={clsx(
                        "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border",
                        run.status === "running" && "text-accent-green bg-accent-green/10 border-accent-green/30",
                        run.status === "completed" && "text-gray-400 bg-gray-400/10 border-gray-400/30",
                        run.status === "paused" && "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
                        run.status === "blocked" && "text-accent-red bg-accent-red/10 border-accent-red/30",
                        run.status === "canceled" && "text-gray-500 bg-gray-500/10 border-gray-500/30"
                      )}
                    >
                      {run.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
