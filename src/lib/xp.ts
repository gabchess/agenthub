/**
 * Agent XP (Experience Points) system.
 *
 * Tracks agent performance via reliability, speed, and efficiency metrics.
 * Every step completion/failure generates an XP event that updates aggregate stats.
 *
 * XP Formula:
 *   Base = 10 per completion
 *   + Reliability bonus: +5 if no retries
 *   + Speed bonus: up to +3 (30s = full, 5min = 0)
 *   + Efficiency bonus: up to +2 (under 2K tokens = full, over 20K = 0.1x)
 *   × Difficulty multiplier: single=1x, loop=2x, on_chain_verify=3x
 *   + Streak bonus: +5 per 5 consecutive successes
 *   - Retry penalty: -3 per retry consumed
 *   - Failure: -5 XP, streak reset
 *   Minimum: 1 XP per completion
 */

import crypto from "node:crypto";
import { getDb } from "../db.js";

// ── Level Thresholds ──────────────────────────────────────────────

export interface LevelInfo {
  level: number;
  name: string;
  minXp: number;
  badgeColor: string;
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: "Rookie",     minXp: 0,      badgeColor: "gray" },
  { level: 2, name: "Apprentice", minXp: 100,     badgeColor: "cyan" },
  { level: 3, name: "Veteran",    minXp: 500,     badgeColor: "green" },
  { level: 4, name: "Expert",     minXp: 2000,    badgeColor: "amber" },
  { level: 5, name: "Legend",     minXp: 10000,   badgeColor: "purple" },
];

export function getLevelForXp(totalXp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(currentLevel: number): LevelInfo | null {
  const idx = LEVELS.findIndex(l => l.level === currentLevel);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

// ── Difficulty Tiers ──────────────────────────────────────────────

function getDifficultyMultiplier(stepType: string): number {
  switch (stepType) {
    case "on_chain_verify": return 3;
    case "loop": return 2;
    default: return 1;
  }
}

// ── XP Calculation ────────────────────────────────────────────────

function calculateSpeedBonus(durationMs: number): number {
  if (durationMs <= 30_000) return 3;
  if (durationMs >= 300_000) return 0;
  // Linear decay from 3 to 0 between 30s and 5min
  return Math.round(3 * (1 - (durationMs - 30_000) / 270_000) * 10) / 10;
}

function calculateEfficiencyBonus(totalTokens: number): number {
  if (totalTokens <= 2_000) return 2;
  if (totalTokens >= 20_000) return 0.2;
  // Linear decay from 2 to 0.2 between 2K and 20K
  return Math.round((2 - 1.8 * (totalTokens - 2_000) / 18_000) * 10) / 10;
}

export interface StepXpInput {
  agentId: string;
  runId: string;
  stepId: string;
  stepType: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  retryCount: number;
  wasRetry: boolean;
}

export function calculateStepXp(input: StepXpInput): number {
  const baseXp = 10;
  const reliabilityBonus = input.retryCount === 0 ? 5 : 0;
  const speedBonus = calculateSpeedBonus(input.durationMs);
  const efficiencyBonus = calculateEfficiencyBonus(input.inputTokens + input.outputTokens);
  const difficultyMultiplier = getDifficultyMultiplier(input.stepType);
  const retryPenalty = input.retryCount * 3;

  let xp = (baseXp + reliabilityBonus + speedBonus + efficiencyBonus) * difficultyMultiplier - retryPenalty;

  // Minimum 1 XP for any completion
  return Math.max(1, Math.round(xp));
}

// ── Database Operations ───────────────────────────────────────────

function extractArchetype(agentId: string): string {
  // "defi-sentinel/scout" → "scout"
  return agentId.split("/").pop() || agentId;
}

function ensureAgentXpRow(archetype: string): void {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM agent_xp WHERE agent_archetype = ?").get(archetype);
  if (!existing) {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO agent_xp (id, agent_archetype, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run(crypto.randomUUID(), archetype, now, now);
  }
}

/**
 * Record XP for a completed step. Non-blocking — errors are swallowed.
 */
export function recordStepXp(input: StepXpInput): void {
  try {
    const db = getDb();
    const archetype = extractArchetype(input.agentId);
    ensureAgentXpRow(archetype);

    const xpDelta = calculateStepXp(input);
    const now = new Date().toISOString();

    // Insert XP event
    db.prepare(
      `INSERT INTO agent_xp_events (id, agent_archetype, run_id, step_id, event_type, xp_delta, step_type, difficulty_tier, duration_ms, input_tokens, output_tokens, was_retry, created_at)
       VALUES (?, ?, ?, ?, 'step_complete', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(), archetype, input.runId, input.stepId,
      xpDelta, input.stepType, getDifficultyMultiplier(input.stepType),
      input.durationMs, input.inputTokens, input.outputTokens,
      input.wasRetry ? 1 : 0, now
    );

    // Update aggregate
    const row = db.prepare("SELECT * FROM agent_xp WHERE agent_archetype = ?").get(archetype) as any;
    const newTotalXp = (row.total_xp || 0) + xpDelta;
    const newStepsCompleted = (row.steps_completed || 0) + 1;
    const newStreak = (row.current_streak || 0) + 1;
    const newBestStreak = Math.max(row.best_streak || 0, newStreak);
    const newTotalInput = (row.total_input_tokens || 0) + input.inputTokens;
    const newTotalOutput = (row.total_output_tokens || 0) + input.outputTokens;
    const totalSteps = newStepsCompleted + (row.steps_failed || 0);
    const newSuccessRate = totalSteps > 0 ? Math.round((newStepsCompleted / totalSteps) * 10000) : 10000;
    const newAvgDuration = Math.round(
      ((row.avg_duration_ms || 0) * (newStepsCompleted - 1) + input.durationMs) / newStepsCompleted
    );

    // Streak bonus: +5 per 5 consecutive successes
    const streakBonus = newStreak > 0 && newStreak % 5 === 0 ? 5 : 0;
    const finalXp = newTotalXp + streakBonus;

    const levelInfo = getLevelForXp(finalXp);

    db.prepare(
      `UPDATE agent_xp SET
        total_xp = ?, level = ?, level_name = ?,
        steps_completed = ?, avg_duration_ms = ?,
        total_input_tokens = ?, total_output_tokens = ?,
        success_rate = ?, current_streak = ?, best_streak = ?,
        updated_at = ?
      WHERE agent_archetype = ?`
    ).run(
      finalXp, levelInfo.level, levelInfo.name,
      newStepsCompleted, newAvgDuration,
      newTotalInput, newTotalOutput,
      newSuccessRate, newStreak, newBestStreak,
      now, archetype
    );

    // Record streak bonus as separate event if triggered
    if (streakBonus > 0) {
      db.prepare(
        `INSERT INTO agent_xp_events (id, agent_archetype, run_id, step_id, event_type, xp_delta, created_at)
         VALUES (?, ?, ?, ?, 'streak_bonus', ?, ?)`
      ).run(crypto.randomUUID(), archetype, input.runId, input.stepId, streakBonus, now);
    }
  } catch {
    // Non-blocking — never break the pipeline
  }
}

/**
 * Record XP penalty for a failed step. Non-blocking.
 */
export function recordStepFailure(agentId: string, runId: string, stepId: string): void {
  try {
    const db = getDb();
    const archetype = extractArchetype(agentId);
    ensureAgentXpRow(archetype);

    const xpDelta = -5;
    const now = new Date().toISOString();

    // Insert failure event
    db.prepare(
      `INSERT INTO agent_xp_events (id, agent_archetype, run_id, step_id, event_type, xp_delta, created_at)
       VALUES (?, ?, ?, ?, 'step_fail', ?, ?)`
    ).run(crypto.randomUUID(), archetype, runId, stepId, xpDelta, now);

    // Update aggregate — reset streak, increment failures
    const row = db.prepare("SELECT * FROM agent_xp WHERE agent_archetype = ?").get(archetype) as any;
    const newTotalXp = Math.max(0, (row.total_xp || 0) + xpDelta);
    const newStepsFailed = (row.steps_failed || 0) + 1;
    const totalSteps = (row.steps_completed || 0) + newStepsFailed;
    const newSuccessRate = totalSteps > 0 ? Math.round(((row.steps_completed || 0) / totalSteps) * 10000) : 0;
    const levelInfo = getLevelForXp(newTotalXp);

    db.prepare(
      `UPDATE agent_xp SET
        total_xp = ?, level = ?, level_name = ?,
        steps_failed = ?, success_rate = ?,
        current_streak = 0, updated_at = ?
      WHERE agent_archetype = ?`
    ).run(newTotalXp, levelInfo.level, levelInfo.name, newStepsFailed, newSuccessRate, now, archetype);
  } catch {
    // Non-blocking
  }
}

/**
 * Get XP data for all agents.
 */
export function getAllAgentXp(): any[] {
  try {
    const db = getDb();
    return db.prepare("SELECT * FROM agent_xp ORDER BY total_xp DESC").all();
  } catch {
    return [];
  }
}

/**
 * Get XP data for a specific agent archetype.
 */
export function getAgentXp(archetype: string): any | null {
  try {
    const db = getDb();
    return db.prepare("SELECT * FROM agent_xp WHERE agent_archetype = ?").get(archetype) || null;
  } catch {
    return null;
  }
}

/**
 * Get recent XP events for an agent.
 */
export function getAgentXpEvents(archetype: string, limit = 50): any[] {
  try {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM agent_xp_events WHERE agent_archetype = ? ORDER BY created_at DESC LIMIT ?"
    ).all(archetype, limit);
  } catch {
    return [];
  }
}
