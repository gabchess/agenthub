"use client";

import { clsx } from "clsx";
import { GlowCard } from "@/components/ui/glow-card";
import { RoleBadge } from "@/components/ui/role-badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { GuardrailsSummary } from "./guardrails-summary";
import { LEVEL_THRESHOLDS } from "@/lib/constants";
import type { AgentRole, Guardrail, AgentXp } from "@/lib/types";

const ROLE_ICONS: Record<string, string> = {
  analysis: "\u{1F50D}",   // magnifying glass
  coding: "\u{1F4BB}",     // laptop
  verification: "\u{2705}", // check mark
  testing: "\u{1F9EA}",    // test tube
  pr: "\u{1F4E4}",         // outbox
  scanning: "\u{1F6E1}",   // shield
};

interface AgentInfo {
  id: string;
  name?: string;
  role?: AgentRole;
  stepsAssigned: string[];
}

function xpProgress(xp: AgentXp): number {
  const currentThreshold = LEVEL_THRESHOLDS[xp.level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[xp.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (nextThreshold <= currentThreshold) return 100;
  const progress = ((xp.total_xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
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
  return (
    <GlowCard className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0",
            agent.role === "analysis" && "bg-accent-cyan/10 border border-accent-cyan/30",
            agent.role === "coding" && "bg-accent-green/10 border border-accent-green/30",
            agent.role === "verification" && "bg-accent-amber/10 border border-accent-amber/30",
            agent.role === "testing" && "bg-accent-purple/10 border border-accent-purple/30",
            agent.role === "scanning" && "bg-accent-red/10 border border-accent-red/30",
            !agent.role && "bg-gray-500/10 border border-gray-500/30"
          )}>
            {agent.role ? ROLE_ICONS[agent.role] || "\u{1F916}" : "\u{1F916}"}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-200">
              {agent.name || agent.id}
            </h3>
            {xp && <LevelBadge level={xp.level} name={xp.level_name} />}
          </div>
        </div>
        {agent.role && <RoleBadge role={agent.role} />}
      </div>

      <div className="text-[11px] text-gray-500 font-mono">
        ID: {agent.id}
      </div>

      {xp && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              XP Progress
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              {xp.total_xp} XP
            </span>
          </div>
          <div className="w-full h-1 bg-raised rounded-full overflow-hidden">
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
          <div className="text-[11px] text-gray-500 font-mono">
            {xp.steps_completed} steps | {(xp.success_rate / 100).toFixed(1)}% reliability | streak: {xp.current_streak}
          </div>
        </div>
      )}

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
