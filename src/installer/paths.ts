import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundled workflows ship with agenthub (in the repo's workflows/ directory)
export function resolveBundledWorkflowsDir(): string {
  // From dist/installer/paths.js -> ../../workflows
  return path.resolve(__dirname, "..", "..", "workflows");
}

export function resolveBundledWorkflowDir(workflowId: string): string {
  return path.join(resolveBundledWorkflowsDir(), workflowId);
}

export function resolveOpenClawStateDir(): string {
  const env = process.env.OPENCLAW_STATE_DIR?.trim();
  if (env) {
    return env;
  }
  return path.join(os.homedir(), ".openclaw");
}

export function resolveOpenClawConfigPath(): string {
  const env = process.env.OPENCLAW_CONFIG_PATH?.trim();
  if (env) {
    return env;
  }
  return path.join(resolveOpenClawStateDir(), "openclaw.json");
}

export function resolveAgentHubRoot(): string {
  return path.join(resolveOpenClawStateDir(), "agenthub");
}

export function resolveWorkflowRoot(): string {
  return path.join(resolveAgentHubRoot(), "workflows");
}

export function resolveWorkflowDir(workflowId: string): string {
  return path.join(resolveWorkflowRoot(), workflowId);
}

export function resolveWorkflowWorkspaceRoot(): string {
  return path.join(resolveOpenClawStateDir(), "workspaces", "workflows");
}

export function resolveWorkflowWorkspaceDir(workflowId: string): string {
  return path.join(resolveWorkflowWorkspaceRoot(), workflowId);
}

export function resolveRunRoot(): string {
  return path.join(resolveAgentHubRoot(), "runs");
}

export function resolveAgentHubCli(): string {
  // From dist/installer/paths.js -> ../../dist/cli/cli.js
  return path.resolve(__dirname, "..", "cli", "cli.js");
}
