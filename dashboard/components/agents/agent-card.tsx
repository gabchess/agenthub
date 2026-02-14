"use client";

import { clsx } from "clsx";
import { GlowCard } from "@/components/ui/glow-card";
import { RoleBadge } from "@/components/ui/role-badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { GuardrailsSummary } from "./guardrails-summary";
import { LEVEL_THRESHOLDS } from "@/lib/constants";
import type { AgentRole, Guardrail, AgentXp } from "@/lib/types";

const ROLE_ICONS: Record<string, string> = {
  analysis: "/icons/analyzer.svg",
  coding: "/icons/executor.svg",
  verification: "/icons/guardian.svg",
  testing: "/icons/strategist.svg",
  pr: "/icons/strategist.svg",
  scanning: "/icons/scout.svg",
};

const ROLE_ACCENT: Record<string, string> = {
  analysis: "accent-cyan",
  coding: "accent-green",
  verification: "accent-amber",
  testing: "accent-purple",
  pr: "gray-400",
  scanning: "accent-red",
};

const ROLE_GLOW: Record<string, string> = {
  analysis: "rgba(0,229,255,0.35)",
  coding: "rgba(0,255,136,0.35)",
  verification: "rgba(255,179,0,0.35)",
  testing: "rgba(167,139,250,0.35)",
  pr: "rgba(156,163,175,0.2)",
  scanning: "rgba(255,61,61,0.35)",
};

interface AgentInfo {
  id: string;
  name?: string;
  role?: AgentRole;
  stepsAssigned: string[];
  totalRuns?: number;
  lastActive?: string;
}

function xpProgress(xp: AgentXp): number {
  const currentThreshold = LEVEL_THRESHOLDS[xp.level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[xp.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (nextThreshold <= currentThreshold) return 100;
  const progress = ((xp.total_xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function AgentCard({
  agent,
  guardrail,
  xp,
}: {
  agent: AgentInfo;
  guardrail?: Guardrail;
  xp?: AgentXp;
}) {
  const accent = agent.role ? ROLE_ACCENT[agent.role] || "gray-400" : "gray-400";
  const glow = agent.role ? ROLE_GLOW[agent.role] || "transparent" : "transparent";

  return (
    <GlowCard className="group space-y-3 hover:border-border/80 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1.5 icon-glow-wrap",
              `bg-${accent}/10 border border-${accent}/30`
            )}
            style={{ ["--icon-glow" as string]: glow }}
          >
            <img
              src={agent.role ? ROLE_ICONS[agent.role] || "/icons/executor.svg" : "/icons/executor.svg"}
              alt={agent.role || "agent"}
              className="w-full h-full icon-enter icon-breathe icon-pixel-outline"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-200">
              {agent.name || agent.id}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {xp && <LevelBadge level={xp.level} name={xp.level_name} />}
            </div>
          </div>
        </div>
        {agent.role && <RoleBadge role={agent.role} />}
      </div>

      {/* Agent ID */}
      <div className="text-[11px] text-gray-500 font-mono">
        ID: {agent.id}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-border/50">
        <div className="text-center">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider">Runs</div>
          <div className={clsx("text-sm font-mono font-medium", `text-${accent}`)}>
            {agent.totalRuns ?? 0}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider">Steps</div>
          <div className="text-sm font-mono font-medium text-gray-300">
            {xp?.steps_completed ?? 0}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider">Active</div>
          <div className="text-sm font-mono text-gray-400">
            {agent.lastActive ? relativeTimeShort(agent.lastActive) : "—"}
          </div>
        </div>
      </div>

      {/* XP Progress */}
      {xp && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              XP Progress
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              {xp.total_xp} XP
            </span>
          </div>
          <div className="w-full h-1.5 bg-raised rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                xp.level === 1 && "bg-gray-400",
                xp.level === 2 && "bg-accent-cyan",
                xp.level === 3 && "bg-accent-green",
                xp.level === 4 && "bg-accent-amber",
                xp.level === 5 && "bg-accent-purple"
              )}
              style={{ width: `${xpProgress(xp)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
            <span>{(xp.success_rate / 100).toFixed(0)}% reliability</span>
            <span>streak: {xp.current_streak}</span>
          </div>
        </div>
      )}

      {/* Assigned Steps */}
      {agent.stepsAssigned.length > 0 && (
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            Assigned Steps
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

      {/* Guardrails */}
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
