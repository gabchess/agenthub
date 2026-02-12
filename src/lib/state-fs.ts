import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getDb } from "../db.js";

/**
 * StateFsManager provides a filesystem-based state layer for workflow runs.
 *
 * Directory structure:
 * ~/.openclaw/antfarm/state/{runId}/
 *   ├── agents/{agentId}/
 *   │   ├── workspace/
 *   │   ├── outputs/
 *   │   ├── logs/
 *   │   └── memory.json
 *   ├── workflows/{workflowId}/
 *   │   └── context.json
 *   ├── traces/
 *   │   └── {runId}.jsonl
 *   └── wallets/{agentId}/
 *       └── transactions.jsonl
 *
 * All file writes are also tracked in the agent_state table for queryability.
 */
export class StateFsManager {
  private basePath: string;
  private runId: string;
  private workflowId: string;

  constructor(runId: string, workflowId: string, basePath?: string) {
    this.runId = runId;
    this.workflowId = workflowId;
    this.basePath =
      basePath || path.join(os.homedir(), ".openclaw", "antfarm", "state", runId);
  }

  /**
   * Initialize the directory structure for this run.
   */
  async initializeDirectories(): Promise<void> {
    const dirs = [
      path.join(this.basePath, "agents"),
      path.join(this.basePath, "workflows", this.workflowId),
      path.join(this.basePath, "traces"),
      path.join(this.basePath, "wallets"),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Create a namespace for an agent with standard subdirectories.
   */
  async createAgentNamespace(agentId: string): Promise<void> {
    const agentBase = path.join(this.basePath, "agents", agentId);
    const subdirs = ["workspace", "outputs", "logs"];

    for (const subdir of subdirs) {
      await fs.mkdir(path.join(agentBase, subdir), { recursive: true });
    }

    // Initialize memory.json
    const memoryPath = path.join(agentBase, "memory.json");
    try {
      await fs.access(memoryPath);
    } catch {
      await fs.writeFile(memoryPath, JSON.stringify({}, null, 2), "utf-8");
    }
  }

  /**
   * Write a file to an agent's namespace.
   */
  async writeAgentFile(
    agentId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const fullPath = path.join(this.basePath, "agents", agentId, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");

    // Track in database
    this.trackInDb(agentId, "file", filePath, content);
  }

  /**
   * Read a file from an agent's namespace.
   */
  async readAgentFile(agentId: string, filePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, "agents", agentId, filePath);
    return await fs.readFile(fullPath, "utf-8");
  }

  /**
   * List files in an agent's namespace, optionally filtered by a glob pattern.
   */
  async listAgentFiles(agentId: string, pattern?: string): Promise<string[]> {
    const agentBase = path.join(this.basePath, "agents", agentId);
    const files: string[] = [];

    async function walk(dir: string, baseDir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
          await walk(fullPath, baseDir);
        } else {
          files.push(relativePath);
        }
      }
    }

    try {
      await walk(agentBase, agentBase);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }

    // Simple pattern matching (supports wildcards like *.json)
    if (pattern) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      return files.filter((f) => regex.test(f));
    }

    return files;
  }

  /**
   * Write a key-value pair to the shared workflow context.
   * Merges into existing context.json.
   */
  async writeSharedState(key: string, value: string): Promise<void> {
    const contextPath = path.join(
      this.basePath,
      "workflows",
      this.workflowId,
      "context.json"
    );

    let context: Record<string, string> = {};
    try {
      const existing = await fs.readFile(contextPath, "utf-8");
      context = JSON.parse(existing);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }

    context[key] = value;
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2), "utf-8");

    // Track in database
    this.trackInDb("workflow", "shared_state", key, value);
  }

  /**
   * Read a key from the shared workflow context.
   */
  async readSharedState(key: string): Promise<string | null> {
    const contextPath = path.join(
      this.basePath,
      "workflows",
      this.workflowId,
      "context.json"
    );

    try {
      const content = await fs.readFile(contextPath, "utf-8");
      const context = JSON.parse(content);
      return context[key] ?? null;
    } catch (err: any) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  /**
   * Append a trace entry to the run's trace log (JSONL format).
   */
  async appendTrace(trace: any): Promise<void> {
    const tracePath = path.join(this.basePath, "traces", `${this.runId}.jsonl`);
    await fs.mkdir(path.dirname(tracePath), { recursive: true });
    const line = JSON.stringify(trace) + "\n";
    await fs.appendFile(tracePath, line, "utf-8");
  }

  /**
   * Log a wallet transaction for an agent (JSONL format).
   */
  async logTransaction(agentId: string, tx: any): Promise<void> {
    const walletDir = path.join(this.basePath, "wallets", agentId);
    await fs.mkdir(walletDir, { recursive: true });
    const txPath = path.join(walletDir, "transactions.jsonl");
    const line = JSON.stringify(tx) + "\n";
    await fs.appendFile(txPath, line, "utf-8");

    // Track in database
    this.trackInDb(agentId, "wallet", "transaction", JSON.stringify(tx));
  }

  /**
   * Track state changes in the agent_state table for queryability.
   */
  private trackInDb(
    agentId: string,
    namespace: string,
    key: string,
    value: string
  ): void {
    const db = getDb();
    const now = new Date().toISOString();
    const id = `${this.runId}-${agentId}-${namespace}-${key}-${Date.now()}`;

    db.prepare(
      `INSERT INTO agent_state (id, run_id, agent_id, namespace, key, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(run_id, agent_id, namespace, key)
       DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(id, this.runId, agentId, namespace, key, value, now, now);
  }
}

/**
 * Singleton registry for StateFsManager instances.
 */
const managerRegistry = new Map<string, StateFsManager>();

/**
 * Get or create a StateFsManager for a given run.
 */
export function getStateFsManager(
  runId: string,
  workflowId: string
): StateFsManager {
  const key = `${runId}-${workflowId}`;
  if (!managerRegistry.has(key)) {
    managerRegistry.set(key, new StateFsManager(runId, workflowId));
  }
  return managerRegistry.get(key)!;
}
