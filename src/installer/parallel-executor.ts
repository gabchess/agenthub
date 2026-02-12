import { getDb } from "../db.js";
import { ParallelConfig } from "./types.js";

export interface ParallelGroup {
  runId: string;
  groupName: string;
  sequence: number;
  stepIds: string[];
}

/**
 * Identify parallel groups in a run by querying steps with parallel_group set
 */
export function identifyParallelGroups(runId: string): ParallelGroup[] {
  const db = getDb();

  // Get all steps with parallel_group set, grouped by parallel_group and sequence
  const rows = db.prepare(`
    SELECT id, parallel_group, parallel_sequence
    FROM steps
    WHERE run_id = ? AND parallel_group IS NOT NULL
    ORDER BY parallel_sequence ASC, step_index ASC
  `).all(runId) as any[];

  // Group by parallel_group and sequence
  const groupMap = new Map<string, Map<number, string[]>>();

  for (const row of rows) {
    const groupName = row.parallel_group;
    const sequence = row.parallel_sequence || 0;

    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, new Map());
    }

    const seqMap = groupMap.get(groupName)!;
    if (!seqMap.has(sequence)) {
      seqMap.set(sequence, []);
    }

    seqMap.get(sequence)!.push(row.id);
  }

  // Convert to ParallelGroup array
  const groups: ParallelGroup[] = [];

  for (const groupName of Array.from(groupMap.keys())) {
    const seqMap = groupMap.get(groupName)!;
    for (const sequence of Array.from(seqMap.keys())) {
      const stepIds = seqMap.get(sequence)!;
      groups.push({
        runId,
        groupName,
        sequence,
        stepIds,
      });
    }
  }

  return groups;
}

/**
 * Get a pending parallel step that this agent can claim
 */
export function getParallelStepForAgent(
  agentId: string
): { stepId: string; runId: string; input: string } | null {
  const db = getDb();

  // Find a step that:
  // 1. Has parallel_group set
  // 2. Is in 'waiting' status
  // 3. Matches this agent
  const row = db.prepare(`
    SELECT id, run_id, input_template
    FROM steps
    WHERE agent_id = ?
      AND parallel_group IS NOT NULL
      AND status = 'waiting'
    ORDER BY step_index ASC
    LIMIT 1
  `).get(agentId) as any;

  if (!row) return null;

  return {
    stepId: row.id,
    runId: row.run_id,
    input: row.input_template,
  };
}

/**
 * Check if a parallel step can be claimed based on concurrency limits
 */
export function canClaimParallelStep(stepId: string): boolean {
  const db = getDb();

  // Get the step details
  const step = db.prepare(`
    SELECT run_id, parallel_group, parallel_sequence
    FROM steps
    WHERE id = ?
  `).get(stepId) as any;

  if (!step || !step.parallel_group) {
    return false; // Not a parallel step
  }

  // Get the run configuration for max concurrency
  const run = db.prepare(`
    SELECT max_parallel_agents FROM runs WHERE id = ?
  `).get(step.run_id) as any;

  const maxConcurrency = run?.max_parallel_agents || 5; // Default to 5

  // Count running steps in this parallel group
  const countRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM steps
    WHERE run_id = ?
      AND parallel_group = ?
      AND status = 'running'
  `).get(step.run_id, step.parallel_group) as any;

  const runningCount = countRow.count || 0;

  // Check if we can claim this step
  return runningCount < maxConcurrency;
}

/**
 * Wait for all steps in a parallel group to complete
 */
export async function waitForParallelGroupCompletion(
  runId: string,
  groupName: string,
  timeoutMs: number = 300000 // Default 5 minutes
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 1000; // Poll every second

  while (Date.now() - startTime < timeoutMs) {
    const db = getDb();

    // Check if all steps in this group are done or failed
    const row = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status IN ('done', 'failed') THEN 1 ELSE 0 END) as completed
      FROM steps
      WHERE run_id = ? AND parallel_group = ?
    `).get(runId, groupName) as any;

    const total = row.total || 0;
    const completed = row.completed || 0;

    if (total === 0) {
      // No steps in this group
      return true;
    }

    if (total === completed) {
      // All steps completed
      return true;
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached
  return false;
}

/**
 * Get all steps in a parallel group
 */
export function getParallelGroupSteps(
  runId: string,
  groupName: string,
  sequence?: number
): any[] {
  const db = getDb();

  let sql = `
    SELECT id, step_id, agent_id, status, parallel_sequence
    FROM steps
    WHERE run_id = ? AND parallel_group = ?
  `;

  const params: any[] = [runId, groupName];

  if (sequence !== undefined) {
    sql += ` AND parallel_sequence = ?`;
    params.push(sequence);
  }

  sql += ` ORDER BY parallel_sequence ASC, step_index ASC`;

  return db.prepare(sql).all(...params) as any[];
}

/**
 * Get concurrency stats for a parallel group
 */
export function getParallelGroupStats(
  runId: string,
  groupName: string
): {
  total: number;
  waiting: number;
  running: number;
  done: number;
  failed: number;
} {
  const db = getDb();

  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM steps
    WHERE run_id = ? AND parallel_group = ?
  `).get(runId, groupName) as any;

  return {
    total: row.total || 0,
    waiting: row.waiting || 0,
    running: row.running || 0,
    done: row.done || 0,
    failed: row.failed || 0,
  };
}

/**
 * Claim a parallel step (atomically update status to running)
 */
export function claimParallelStep(stepId: string): boolean {
  const db = getDb();

  // Check if we can claim first
  if (!canClaimParallelStep(stepId)) {
    return false;
  }

  const now = new Date().toISOString();

  // Atomically update status from waiting to running
  const result = db.prepare(`
    UPDATE steps
    SET status = 'running', updated_at = ?
    WHERE id = ? AND status = 'waiting'
  `).run(now, stepId);

  return result.changes > 0;
}
