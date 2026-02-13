import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { getDb } from "../db.js";
import { logger } from "./logger.js";

export type TraceType =
  | "step.claim"
  | "step.complete"
  | "step.fail"
  | "model.request"
  | "model.response"
  | "tool.call"
  | "tool.result"
  | "guardrail.check"
  | "guardrail.block"
  | "approval.request"
  | "approval.granted"
  | "wallet.tx"
  | "state.read"
  | "state.write";

export interface TraceEntry {
  id: string;
  runId: string;
  stepId?: string;
  agentId: string;
  traceType: TraceType;
  timestamp: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  extendedThinkingUsed?: boolean;
  data: Record<string, any>;
  createdAt: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Get the JSONL file path for a run
 */
function getTracePath(runId: string): string {
  const homeDir = os.homedir();
  return path.join(
    homeDir,
    ".openclaw",
    "agenthub",
    "state",
    runId,
    "traces",
    `${runId}.jsonl`
  );
}

/**
 * Ensure the trace directory exists
 */
async function ensureTraceDir(runId: string): Promise<void> {
  const tracePath = getTracePath(runId);
  const traceDir = path.dirname(tracePath);
  await fs.mkdir(traceDir, { recursive: true });
}

/**
 * Check if file needs rotation and rotate if necessary
 */
async function rotateIfNeeded(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size >= MAX_FILE_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rotatedPath = `${filePath}.${timestamp}`;
      await fs.rename(filePath, rotatedPath);
      logger.info(`Rotated trace file to ${rotatedPath}`);
    }
  } catch (error: any) {
    // File doesn't exist yet, no rotation needed
    if (error.code !== "ENOENT") {
      logger.error("Error checking file size for rotation");
    }
  }
}

/**
 * Append a trace entry to the JSONL file
 */
async function appendToJSONL(runId: string, entry: TraceEntry): Promise<void> {
  try {
    await ensureTraceDir(runId);
    const tracePath = getTracePath(runId);
    await rotateIfNeeded(tracePath);
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(tracePath, line, "utf-8");
  } catch (error) {
    logger.error("Failed to append to JSONL trace file", { runId });
  }
}

/**
 * Insert a trace entry into the database and JSONL file
 */
async function insertTrace(entry: TraceEntry): Promise<void> {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO execution_traces (
        id, run_id, step_id, agent_id, trace_type, timestamp,
        duration_ms, input_tokens, output_tokens, model,
        extended_thinking_used, data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.id,
      entry.runId,
      entry.stepId || null,
      entry.agentId,
      entry.traceType,
      entry.timestamp,
      entry.durationMs || null,
      entry.inputTokens || null,
      entry.outputTokens || null,
      entry.model || null,
      entry.extendedThinkingUsed ? 1 : 0,
      JSON.stringify(entry.data),
      entry.createdAt
    );

    // Also append to JSONL file
    await appendToJSONL(entry.runId, entry);

    // Log the trace event
    logger.debug("Trace recorded", {
      runId: entry.runId,
      stepId: entry.stepId,
    });
  } catch (error) {
    logger.error("Failed to insert trace", {
      runId: entry.runId,
    });
  }
}

/**
 * Log a step claim event
 */
export async function traceStepClaim(
  runId: string,
  stepId: string,
  agentId: string,
  input: any
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId,
    traceType: "step.claim",
    timestamp: now,
    data: { input },
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Log a model request event
 */
export async function traceModelRequest(
  runId: string,
  stepId: string,
  agentId: string,
  model: string,
  prompt: any,
  thinkingLevel?: string
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId,
    traceType: "model.request",
    timestamp: now,
    model,
    data: { prompt, thinkingLevel },
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Log a model response event
 */
export async function traceModelResponse(
  runId: string,
  stepId: string,
  agentId: string,
  tokens: { input?: number; output?: number },
  duration: number,
  extendedThinking?: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId,
    traceType: "model.response",
    timestamp: now,
    durationMs: duration,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    extendedThinkingUsed: extendedThinking,
    data: {},
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Log a tool call event
 */
export async function traceToolCall(
  runId: string,
  stepId: string,
  agentId: string,
  toolName: string,
  params: any,
  result?: any
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId,
    traceType: "tool.call",
    timestamp: now,
    data: { toolName, params, result },
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Log a step completion event
 */
export async function traceStepComplete(
  runId: string,
  stepId: string,
  output: any,
  duration: number
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId: "", // Step completion doesn't have a specific agent
    traceType: "step.complete",
    timestamp: now,
    durationMs: duration,
    data: { output },
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Log a step failure event
 */
export async function traceStepFail(
  runId: string,
  stepId: string,
  error: string,
  duration: number
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId: "", // Step failure doesn't have a specific agent
    traceType: "step.fail",
    timestamp: now,
    durationMs: duration,
    data: { error },
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Log a guardrail check event
 */
export async function traceGuardrailCheck(
  runId: string,
  stepId: string | undefined,
  agentId: string,
  operation: string,
  result: any
): Promise<void> {
  const now = new Date().toISOString();
  const entry: TraceEntry = {
    id: crypto.randomUUID(),
    runId,
    stepId,
    agentId,
    traceType: "guardrail.check",
    timestamp: now,
    data: { operation, result },
    createdAt: now,
  };
  await insertTrace(entry);
}

/**
 * Query traces from the database with optional filtering
 */
export async function queryTraces(
  runId: string,
  options?: {
    stepId?: string;
    agentId?: string;
    traceType?: TraceType;
    limit?: number;
    offset?: number;
  }
): Promise<TraceEntry[]> {
  try {
    const db = getDb();
    let sql = `SELECT * FROM execution_traces WHERE run_id = ?`;
    const params: any[] = [runId];

    if (options?.stepId) {
      sql += ` AND step_id = ?`;
      params.push(options.stepId);
    }

    if (options?.agentId) {
      sql += ` AND agent_id = ?`;
      params.push(options.agentId);
    }

    if (options?.traceType) {
      sql += ` AND trace_type = ?`;
      params.push(options.traceType);
    }

    sql += ` ORDER BY timestamp ASC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map((row: any) => ({
      id: row.id,
      runId: row.run_id,
      stepId: row.step_id || undefined,
      agentId: row.agent_id,
      traceType: row.trace_type as TraceType,
      timestamp: row.timestamp,
      durationMs: row.duration_ms || undefined,
      inputTokens: row.input_tokens || undefined,
      outputTokens: row.output_tokens || undefined,
      model: row.model || undefined,
      extendedThinkingUsed: row.extended_thinking_used === 1,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
    }));
  } catch (error) {
    logger.error("Failed to query traces", { runId });
    return [];
  }
}

/**
 * Export traces to a JSONL file
 */
export async function exportTracesToJSONL(
  runId: string,
  filePath: string
): Promise<void> {
  try {
    const traces = await queryTraces(runId);

    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write traces to file
    const lines = traces.map((trace) => JSON.stringify(trace)).join("\n");
    await fs.writeFile(filePath, lines + "\n", "utf-8");

    logger.info("Exported traces to JSONL", { runId });
  } catch (error) {
    logger.error("Failed to export traces to JSONL", { runId });
    throw error;
  }
}
