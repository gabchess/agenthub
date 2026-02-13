export type ThinkingLevel = "low" | "medium" | "high";

export interface ThinkingConfig {
  level: ThinkingLevel;
  extendedThinking?: boolean;
  tokenBudget?: number;
}

export interface GuardrailConfig {
  toolAllowlist?: string[];
  toolDenylist?: string[];
  maxSpendPerTx?: number;
  maxSpendPerRun?: number;
  approvalThreshold?: number;
  requireSimulation?: boolean;
  parallelAllowed?: boolean;
}

export interface ParallelConfig {
  group: string;
  sequence?: number;
  maxConcurrency?: number;
}

export interface RoleCard {
  domain?: string;
  inputs?: string[];
  outputs?: string[];
  definitionOfDone?: string;
  hardBans?: string[];
  escalation?: string;
  metrics?: string[];
}

export interface WalletConfig {
  enabled: boolean;
  address?: string;
  maxBalance?: number;
}

export type WorkflowAgentFiles = {
  baseDir: string;
  files: Record<string, string>;
  skills?: string[];
};

/**
 * Agent roles control tool access during install.
 *
 * - analysis:      Read-only code exploration (planner, prioritizer, reviewer, investigator, triager)
 * - coding:        Full read/write/exec for implementation (developer, fixer, setup)
 * - verification:  Read + exec but NO write — independent verification integrity (verifier)
 * - testing:       Read + exec + browser/web for E2E testing, NO write (tester)
 * - pr:            Read + exec only — just runs `gh pr create` (pr)
 * - scanning:      Read + exec + web search for CVE lookups, NO write (scanner)
 */
export type AgentRole = "analysis" | "coding" | "verification" | "testing" | "pr" | "scanning";

export type WorkflowAgent = {
  id: string;
  name?: string;
  description?: string;
  role?: AgentRole;
  model?: string;
  timeoutSeconds?: number;
  workspace: WorkflowAgentFiles;
  thinking?: ThinkingConfig;
  guardrails?: GuardrailConfig;
  wallet?: WalletConfig;
  roleCard?: RoleCard;
};

export type WorkflowStepFailure = {
  retry_step?: string;
  max_retries?: number;
  on_exhausted?: { escalate_to: string } | { escalate_to?: string } | undefined;
  escalate_to?: string;
};

export type LoopConfig = {
  over: "stories";
  completion: "all_done";
  freshSession?: boolean;
  verifyEach?: boolean;
  verifyStep?: string;
};

/**
 * Blockchain verification configuration for on_chain_verify steps
 */
export type OnChainVerifyConfig = {
  chain: "monad-testnet" | "monad-mainnet";
  operation: "submit_tx" | "read_state" | "verify_event" | "wallet_balance" | "token_price" | "contract_read";
  contract_address?: string;
  expected_state?: Record<string, any>;
  wait_for_confirmation?: boolean;
  timeout_ms?: number;
  tool_params?: any;
};

export type WorkflowStep = {
  id: string;
  agent: string;
  type?: "single" | "loop" | "on_chain_verify";
  loop?: LoopConfig;
  on_chain?: OnChainVerifyConfig;
  input: string;
  expects: string;
  max_retries?: number;
  on_fail?: WorkflowStepFailure;
  parallel?: ParallelConfig;
  thinking?: ThinkingConfig;
};

export type Story = {
  id: string;
  runId: string;
  storyIndex: number;
  storyId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: "pending" | "running" | "done" | "failed";
  output?: string;
  retryCount: number;
  maxRetries: number;
};

export type WorkflowSpec = {
  id: string;
  name?: string;
  version?: number;
  agents: WorkflowAgent[];
  steps: WorkflowStep[];
  context?: Record<string, string>;
  notifications?: {
    url?: string;
  };
  parallel?: {
    enabled: boolean;
    maxConcurrentAgents?: number;
  };
  filesystem?: {
    enabled: boolean;
    basePath?: string;
  };
};

export type WorkflowInstallResult = {
  workflowId: string;
  workflowDir: string;
};

export type StepResult = {
  stepId: string;
  agentId: string;
  output: string;
  status: "done" | "retry" | "blocked";
  completedAt: string;
};

export type WorkflowRunRecord = {
  id: string;
  workflowId: string;
  workflowName?: string;
  taskTitle: string;
  status: "running" | "paused" | "blocked" | "completed" | "canceled";
  leadAgentId: string;
  leadSessionLabel: string;
  currentStepIndex: number;
  currentStepId?: string;
  stepResults: StepResult[];
  retryCount: number;
  context: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export interface StepBriefing {
  meta: {
    runId: string;
    stepId: string;
    agentId: string;
    workflowId: string;
    attempt: number;
    timestamp: string;
    warnings: string[];
  };
  task: string;
  priorOutputs: Record<string, {
    stepId: string;
    agentId: string;
    status: string;
    output: string;
    parsed: Record<string, string>;
  }>;
  context: Record<string, string>;
  constraints: {
    toolAllowlist?: string[];
    maxSpendPerRun?: number;
  };
  story?: {
    storyId: string;
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
}
