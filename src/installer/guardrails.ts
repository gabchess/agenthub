import { getDb } from "../db.js";
import { GuardrailConfig } from "./types.js";
import { traceGuardrailCheck } from "../lib/tracer.js";
import { randomUUID } from "node:crypto";

/**
 * Load guardrail configuration for an agent
 */
export function loadAgentGuardrails(agentId: string): GuardrailConfig | null {
  const db = getDb();

  const row = db.prepare(`
    SELECT * FROM agent_guardrails
    WHERE agent_id = ?
  `).get(agentId) as any;

  if (!row) return null;

  return {
    toolAllowlist: row.tool_allowlist ? JSON.parse(row.tool_allowlist) : undefined,
    toolDenylist: row.tool_denylist ? JSON.parse(row.tool_denylist) : undefined,
    maxSpendPerTx: row.max_spend_per_tx ? parseFloat(row.max_spend_per_tx) : undefined,
    maxSpendPerRun: row.max_spend_per_run ? parseFloat(row.max_spend_per_run) : undefined,
    approvalThreshold: row.approval_threshold ? parseFloat(row.approval_threshold) : undefined,
    requireSimulation: row.require_simulation === 1,
    parallelAllowed: row.parallel_allowed === 1,
  };
}

/**
 * Save guardrail configuration for an agent
 */
export function saveAgentGuardrails(agentId: string, config: GuardrailConfig): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO agent_guardrails (
      id, agent_id, tool_allowlist, tool_denylist,
      max_spend_per_tx, max_spend_per_run, approval_threshold,
      require_simulation, parallel_allowed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      tool_allowlist = excluded.tool_allowlist,
      tool_denylist = excluded.tool_denylist,
      max_spend_per_tx = excluded.max_spend_per_tx,
      max_spend_per_run = excluded.max_spend_per_run,
      approval_threshold = excluded.approval_threshold,
      require_simulation = excluded.require_simulation,
      parallel_allowed = excluded.parallel_allowed,
      updated_at = excluded.updated_at
  `).run(
    randomUUID(),
    agentId,
    config.toolAllowlist ? JSON.stringify(config.toolAllowlist) : null,
    config.toolDenylist ? JSON.stringify(config.toolDenylist) : null,
    config.maxSpendPerTx?.toString() || null,
    config.maxSpendPerRun?.toString() || null,
    config.approvalThreshold?.toString() || null,
    config.requireSimulation ? 1 : 0,
    config.parallelAllowed ? 1 : 0,
    now,
    now
  );
}

/**
 * Check if a tool is allowed for an agent
 */
export function checkToolAllowed(agentId: string, toolName: string): boolean {
  const guardrails = loadAgentGuardrails(agentId);

  if (!guardrails) {
    return true; // No guardrails = all tools allowed
  }

  // If allowlist is defined, tool must be in it
  if (guardrails.toolAllowlist && guardrails.toolAllowlist.length > 0) {
    return guardrails.toolAllowlist.includes(toolName);
  }

  // If denylist is defined, tool must NOT be in it
  if (guardrails.toolDenylist && guardrails.toolDenylist.length > 0) {
    return !guardrails.toolDenylist.includes(toolName);
  }

  return true; // No restrictions
}

/**
 * Get current spending for a run
 */
function getCurrentSpending(runId: string): number {
  const db = getDb();

  // Query execution_traces for wallet.tx events
  const rows = db.prepare(`
    SELECT data FROM execution_traces
    WHERE run_id = ? AND trace_type = 'wallet.tx'
  `).all(runId) as any[];

  let total = 0;
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (data.amount && typeof data.amount === 'number') {
        total += data.amount;
      }
    } catch (e) {
      // Skip malformed data
    }
  }

  return total;
}

/**
 * Check if spending is within limits
 */
export async function checkSpendingLimit(
  agentId: string,
  runId: string,
  amount: number
): Promise<{
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  currentSpend: number;
}> {
  const guardrails = loadAgentGuardrails(agentId);
  const currentSpend = getCurrentSpending(runId);

  // No guardrails = unlimited spending
  if (!guardrails) {
    return {
      allowed: true,
      requiresApproval: false,
      currentSpend,
    };
  }

  // Check per-transaction limit
  if (guardrails.maxSpendPerTx && amount > guardrails.maxSpendPerTx) {
    const result = {
      allowed: false,
      requiresApproval: true,
      reason: `Transaction amount ${amount} exceeds per-tx limit of ${guardrails.maxSpendPerTx}`,
      currentSpend,
    };

    await traceGuardrailCheck(runId, undefined, agentId, "spending_limit", result);
    return result;
  }

  // Check per-run limit
  if (guardrails.maxSpendPerRun && (currentSpend + amount) > guardrails.maxSpendPerRun) {
    const result = {
      allowed: false,
      requiresApproval: true,
      reason: `Total spending ${currentSpend + amount} would exceed run limit of ${guardrails.maxSpendPerRun}`,
      currentSpend,
    };

    await traceGuardrailCheck(runId, undefined, agentId, "spending_limit", result);
    return result;
  }

  // Check approval threshold
  if (guardrails.approvalThreshold && amount >= guardrails.approvalThreshold) {
    const result = {
      allowed: true,
      requiresApproval: true,
      reason: `Transaction amount ${amount} meets approval threshold of ${guardrails.approvalThreshold}`,
      currentSpend,
    };

    await traceGuardrailCheck(runId, undefined, agentId, "approval_threshold", result);
    return result;
  }

  const result = {
    allowed: true,
    requiresApproval: false,
    currentSpend,
  };

  await traceGuardrailCheck(runId, undefined, agentId, "spending_limit", result);
  return result;
}

/**
 * Request approval for an operation (stub implementation)
 */
export async function requireApproval(
  agentId: string,
  runId: string,
  operation: string,
  params: any,
  amount?: number
): Promise<{ approvalId: string; pending: boolean }> {
  const approvalId = randomUUID();

  // Trace the approval request
  await traceGuardrailCheck(runId, undefined, agentId, "approval_request", {
    approvalId,
    operation,
    params,
    amount,
  });

  // TODO: Implement actual approval queue integration
  // For now, return pending status
  return {
    approvalId,
    pending: true,
  };
}
