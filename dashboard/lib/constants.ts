import type { TraceType, AgentRole, RunStatus, StepStatus, StoryStatus } from "./types";

// Polling intervals (ms)
export const POLL_TRACES = 2000;
export const POLL_RUN_DETAIL = 5000;
export const POLL_RUNS_LIST = 10000;
export const POLL_WALLETS = 10000;
export const POLL_WORKFLOWS = 30000;
export const POLL_STORIES = 5000;

// Trace type → color class mapping
export const TRACE_TYPE_COLORS: Record<TraceType, string> = {
  "step.claim": "text-accent-green bg-accent-green/10 border-accent-green/30",
  "step.complete": "text-accent-green bg-accent-green/10 border-accent-green/30",
  "step.fail": "text-accent-red bg-accent-red/10 border-accent-red/30",
  "model.request": "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30",
  "model.response": "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30",
  "tool.call": "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  "tool.result": "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  "guardrail.check": "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  "guardrail.block": "text-accent-red bg-accent-red/10 border-accent-red/30",
  "approval.request": "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  "approval.granted": "text-accent-green bg-accent-green/10 border-accent-green/30",
  "wallet.tx": "text-accent-purple bg-accent-purple/10 border-accent-purple/30",
  "state.read": "text-gray-400 bg-gray-400/10 border-gray-400/30",
  "state.write": "text-gray-400 bg-gray-400/10 border-gray-400/30",
};

// Agent role → color class mapping
export const ROLE_COLORS: Record<AgentRole, string> = {
  analysis: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30",
  coding: "text-accent-green bg-accent-green/10 border-accent-green/30",
  verification: "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  testing: "text-accent-purple bg-accent-purple/10 border-accent-purple/30",
  pr: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  scanning: "text-accent-red bg-accent-red/10 border-accent-red/30",
};

// Run status → color class
export const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  running: "text-accent-green bg-accent-green/10 border-accent-green/30",
  paused: "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  blocked: "text-accent-red bg-accent-red/10 border-accent-red/30",
  completed: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  canceled: "text-gray-500 bg-gray-500/10 border-gray-500/30",
};

// Step status → color class
export const STEP_STATUS_COLORS: Record<StepStatus, string> = {
  waiting: "text-gray-500 bg-gray-500/10 border-gray-500/30",
  running: "text-accent-green bg-accent-green/10 border-accent-green/30",
  done: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  failed: "text-accent-red bg-accent-red/10 border-accent-red/30",
  blocked: "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
};

// Story status → color class
export const STORY_STATUS_COLORS: Record<StoryStatus, string> = {
  pending: "text-gray-500 bg-gray-500/10 border-gray-500/30",
  running: "text-accent-green bg-accent-green/10 border-accent-green/30",
  done: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  failed: "text-accent-red bg-accent-red/10 border-accent-red/30",
};

// Level → color class mapping
export const LEVEL_COLORS: Record<number, string> = {
  1: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  2: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30",
  3: "text-accent-green bg-accent-green/10 border-accent-green/30",
  4: "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
  5: "text-accent-purple bg-accent-purple/10 border-accent-purple/30",
};

// Level → glow class mapping
export const LEVEL_GLOWS: Record<number, string> = {
  1: "",
  2: "glow-cyan",
  3: "glow-green",
  4: "",
  5: "glow-purple",
};

// XP thresholds for each level
export const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 10000];

// Navigation items
export const NAV_ITEMS = [
  { href: "/runs", label: "Runs", icon: "play" },
  { href: "/agents", label: "Agents", icon: "users" },
  { href: "/traces", label: "Traces", icon: "activity" },
  { href: "/wallets", label: "Wallets", icon: "wallet" },
  { href: "/pipeline", label: "Pipeline", icon: "pipeline" },
] as const;
