"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { LEVEL_THRESHOLDS } from "@/lib/constants";
import type { AgentRole, Guardrail, AgentXp } from "@/lib/types";

// RPG class mapping for roles
const ROLE_CLASS: Record<string, { title: string; icon: string; color: string; accent: string; bgGradient: string; borderGlow: string }> = {
  analysis: {
    title: "Analyzer",
    icon: "/icons/analyzer.svg",
    color: "accent-purple",
    accent: "#a78bfa",
    bgGradient: "from-purple-950/40 via-surface to-surface",
    borderGlow: "hover:shadow-[0_0_25px_rgba(167,139,250,0.3)]",
  },
  coding: {
    title: "Executor",
    icon: "/icons/executor.svg",
    color: "accent-green",
    accent: "#00ff88",
    bgGradient: "from-green-950/40 via-surface to-surface",
    borderGlow: "hover:shadow-[0_0_25px_rgba(0,255,136,0.3)]",
  },
  verification: {
    title: "Guardian",
    icon: "/icons/guardian.svg",
    color: "accent-amber",
    accent: "#ffb300",
    bgGradient: "from-amber-950/40 via-surface to-surface",
    borderGlow: "hover:shadow-[0_0_25px_rgba(255,179,0,0.3)]",
  },
  testing: {
    title: "Strategist",
    icon: "/icons/strategist.svg",
    color: "accent-cyan",
    accent: "#00e5ff",
    bgGradient: "from-cyan-950/40 via-surface to-surface",
    borderGlow: "hover:shadow-[0_0_25px_rgba(0,229,255,0.3)]",
  },
  pr: {
    title: "Herald",
    icon: "/icons/strategist.svg",
    color: "gray-400",
    accent: "#9ca3af",
    bgGradient: "from-gray-900/40 via-surface to-surface",
    borderGlow: "hover:shadow-[0_0_15px_rgba(156,163,175,0.2)]",
  },
  scanning: {
    title: "Scout",
    icon: "/icons/scout.svg",
    color: "accent-red",
    accent: "#ff3d3d",
    bgGradient: "from-red-950/40 via-surface to-surface",
    borderGlow: "hover:shadow-[0_0_25px_rgba(255,61,61,0.3)]",
  },
};

const LEVEL_TITLES: Record<number, string> = {
  1: "Novice",
  2: "Apprentice",
  3: "Veteran",
  4: "Elite",
  5: "Legend",
};

const LEVEL_FRAME_COLORS: Record<number, string> = {
  1: "border-gray-600",
  2: "border-accent-cyan/50",
  3: "border-accent-green/50",
  4: "border-accent-amber/50",
  5: "border-accent-purple/50",
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

function StatBlock({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center px-2">
      <div className={clsx("text-sm font-bold font-mono", color ? `text-${color}` : "text-gray-200")}>
        {value}
      </div>
      <div className="text-[8px] text-gray-600 uppercase tracking-widest mt-0.5">
        {label}
      </div>
    </div>
  );
}

export function RpgAgentCard({
  agent,
  guardrail,
  xp,
}: {
  agent: AgentInfo;
  guardrail?: Guardrail;
  xp?: AgentXp;
}) {
  const [flipped, setFlipped] = useState(false);

  const roleClass = agent.role ? ROLE_CLASS[agent.role] : null;
  const title = roleClass?.title ?? "Agent";
  const icon = roleClass?.icon ?? "\u{1F916}";
  const accent = roleClass?.accent ?? "#9ca3af";
  const color = roleClass?.color ?? "gray-400";
  const bgGradient = roleClass?.bgGradient ?? "from-gray-900/40 via-surface to-surface";
  const borderGlow = roleClass?.borderGlow ?? "";
  const level = xp?.level ?? 1;
  const levelTitle = LEVEL_TITLES[level] ?? "Unknown";
  const frameColor = LEVEL_FRAME_COLORS[level] ?? "border-gray-600";

  // Front of card
  const front = (
    <div
      className={clsx(
        "relative w-full h-full rounded-xl border-2 overflow-hidden transition-all duration-300",
        `bg-gradient-to-b ${bgGradient}`,
        frameColor,
        borderGlow
      )}
    >
      {/* Card art frame */}
      <div className="group/art relative h-28 overflow-hidden">
        {/* Abstract role pattern */}
        <div className="absolute inset-0 transition-all duration-500 group-hover/art:brightness-125" style={{
          background: `radial-gradient(circle at 50% 80%, ${accent}15 0%, transparent 60%)`,
        }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={icon}
            alt={title}
            className="w-16 h-16 select-none icon-enter icon-breathe"
            style={{
              imageRendering: "pixelated",
              filter: `drop-shadow(0 0 20px ${accent}40) drop-shadow(1px 0 0 rgba(0,0,0,0.5)) drop-shadow(-1px 0 0 rgba(0,0,0,0.5)) drop-shadow(0 1px 0 rgba(0,0,0,0.5)) drop-shadow(0 -1px 0 rgba(0,0,0,0.5)) drop-shadow(0 3px 4px rgba(0,0,0,0.4))`,
            }}
          />
        </div>
        {/* Level orb - top left */}
        <div
          className={clsx(
            "absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
            `border-${color} text-${color}`
          )}
          style={{
            background: `${accent}15`,
            boxShadow: `0 0 10px ${accent}30`,
          }}
        >
          {level}
        </div>
        {/* Role tag - top right */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border"
          style={{
            color: accent,
            borderColor: `${accent}40`,
            background: `${accent}10`,
          }}
        >
          {title}
        </div>
      </div>

      {/* Name plate */}
      <div className="px-3 py-2 border-t border-b" style={{ borderColor: `${accent}20` }}>
        <h3 className="text-sm font-bold text-gray-100 text-center tracking-wide">
          {agent.name || agent.id.split("/").pop()}
        </h3>
        <p className="text-[9px] text-center font-mono mt-0.5" style={{ color: `${accent}99` }}>
          {levelTitle} {title}
        </p>
      </div>

      {/* Stats */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between divide-x divide-border/30">
          <StatBlock label="XP" value={xp?.total_xp ?? 0} color={color} />
          <StatBlock label="Steps" value={xp?.steps_completed ?? 0} />
          <StatBlock label="Streak" value={xp?.current_streak ?? 0} color={color} />
          <StatBlock label="Runs" value={agent.totalRuns ?? 0} />
        </div>
      </div>

      {/* XP bar */}
      {xp && (
        <div className="px-3 pb-2">
          <div className="w-full h-1.5 bg-raised rounded-full overflow-hidden border border-border/30">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${xpProgress(xp)}%`,
                background: `linear-gradient(90deg, ${accent}80, ${accent})`,
                boxShadow: `0 0 6px ${accent}60`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[8px] text-gray-600 font-mono">
              {(xp.success_rate / 100).toFixed(0)}% hit rate
            </span>
            <span className="text-[8px] font-mono" style={{ color: `${accent}80` }}>
              {xpProgress(xp).toFixed(0)}% to Lv.{Math.min(level + 1, 5)}
            </span>
          </div>
        </div>
      )}

      {/* Ability text (steps) */}
      {agent.stepsAssigned.length > 0 && (
        <div className="px-3 pb-2">
          <div className="bg-page/60 rounded border border-border/30 p-2">
            <div className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Abilities</div>
            <div className="flex flex-wrap gap-1">
              {agent.stepsAssigned.map((stepId) => (
                <span
                  key={stepId}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono border"
                  style={{
                    color: `${accent}cc`,
                    borderColor: `${accent}20`,
                    background: `${accent}08`,
                  }}
                >
                  {stepId}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer ID */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-[8px] text-gray-700 font-mono truncate">{agent.id}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFlipped(true);
          }}
          className="text-[9px] font-mono hover:underline transition-colors"
          style={{ color: `${accent}60` }}
        >
          flip &rarr;
        </button>
      </div>
    </div>
  );

  // Back of card — guardrails + detailed stats
  const back = (
    <div
      className={clsx(
        "relative w-full h-full rounded-xl border-2 overflow-hidden",
        "bg-surface",
        frameColor
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b" style={{ borderColor: `${accent}20` }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-200">
            {agent.name || agent.id.split("/").pop()}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(false);
            }}
            className="text-[9px] font-mono hover:underline transition-colors"
            style={{ color: `${accent}60` }}
          >
            &larr; flip
          </button>
        </div>
        <p className="text-[9px] text-gray-600 font-mono">{agent.id}</p>
      </div>

      {/* Detailed stats */}
      <div className="px-3 py-2 space-y-1.5 text-[10px]">
        <div className="text-[8px] text-gray-600 uppercase tracking-widest">Combat Stats</div>
        {xp && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Total XP</span>
              <span className="font-mono" style={{ color: accent }}>{xp.total_xp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Steps Completed</span>
              <span className="text-gray-300 font-mono">{xp.steps_completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Steps Failed</span>
              <span className="text-accent-red font-mono">{xp.steps_failed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hit Rate</span>
              <span className="font-mono" style={{ color: accent }}>{(xp.success_rate / 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Best Streak</span>
              <span className="text-gray-300 font-mono">{xp.best_streak}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg Duration</span>
              <span className="text-gray-300 font-mono">
                {xp.avg_duration_ms < 1000 ? `${xp.avg_duration_ms}ms` : `${(xp.avg_duration_ms / 1000).toFixed(1)}s`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tokens (in/out)</span>
              <span className="text-gray-300 font-mono text-[9px]">
                {xp.total_input_tokens > 1000 ? `${(xp.total_input_tokens / 1000).toFixed(1)}k` : xp.total_input_tokens}
                {" / "}
                {xp.total_output_tokens > 1000 ? `${(xp.total_output_tokens / 1000).toFixed(1)}k` : xp.total_output_tokens}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Guardrails */}
      {guardrail && (
        <div className="px-3 py-2 border-t border-border/30">
          <div className="text-[8px] text-gray-600 uppercase tracking-widest mb-1.5">Guardrails</div>
          <div className="space-y-1.5 text-[10px]">
            {guardrail.max_spend_per_tx && (
              <div className="flex justify-between">
                <span className="text-gray-500">Max spend/tx</span>
                <span className="text-accent-amber font-mono">{guardrail.max_spend_per_tx}</span>
              </div>
            )}
            {guardrail.approval_threshold && (
              <div className="flex justify-between">
                <span className="text-gray-500">Approval threshold</span>
                <span className="text-accent-amber font-mono">{guardrail.approval_threshold}</span>
              </div>
            )}
            {guardrail.require_simulation && (
              <div className="flex justify-between">
                <span className="text-gray-500">Simulation</span>
                <span className="text-accent-green font-mono">required</span>
              </div>
            )}
            {guardrail.tool_allowlist && (
              <div>
                <span className="text-gray-500">Allowed:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {JSON.parse(guardrail.tool_allowlist).map((t: string) => (
                    <span key={t} className="px-1 py-0.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-[8px] font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="group cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={clsx(
          "relative w-full transition-transform duration-500",
          flipped && "[transform:rotateY(180deg)]"
        )}
        style={{ transformStyle: "preserve-3d", minHeight: "380px" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
