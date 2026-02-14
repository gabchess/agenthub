export type RunStatus = "running" | "paused" | "blocked" | "completed" | "canceled";

export type StepStatus = "waiting" | "running" | "done" | "failed" | "blocked";

export type StoryStatus = "pending" | "running" | "done" | "failed";

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

export type AgentRole = "analysis" | "coding" | "verification" | "testing" | "pr" | "scanning";

export interface Run {
  id: string;
  workflow_id: string;
  task: string;
  status: RunStatus;
  context: string;
  created_at: string;
  updated_at: string;
  notify_url?: string;
  parallel_execution_enabled?: boolean;
  max_parallel_agents?: number;
  trace_hash?: string;
  trace_tx_hash?: string;
  trace_committed_at?: string;
  steps: Step[];
}

export interface Step {
  id: string;
  run_id: string;
  step_id: string;
  agent_id: string;
  step_index: number;
  input_template: string;
  expects: string;
  status: StepStatus;
  output?: string;
  retry_count: number;
  max_retries: number;
  type: string;
  loop_config?: string;
  current_story_id?: string;
  thinking_level?: string;
  token_budget?: number;
  extended_thinking?: boolean;
  parallel_group?: string;
  parallel_sequence?: number;
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  run_id: string;
  story_index: number;
  story_id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  status: StoryStatus;
  output?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface Trace {
  id: string;
  run_id: string;
  step_id?: string;
  agent_id?: string;
  trace_type: TraceType;
  timestamp: string;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  model?: string;
  extended_thinking_used?: boolean;
  data: string;
  created_at: string;
}

export interface Guardrail {
  id: string;
  agent_id: string;
  tool_allowlist?: string;
  tool_denylist?: string;
  max_spend_per_tx?: string;
  max_spend_per_run?: string;
  approval_threshold?: string;
  require_simulation?: boolean;
  parallel_allowed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentState {
  id: string;
  run_id: string;
  agent_id: string;
  namespace: string;
  key: string;
  value?: string;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: Array<{ id: string; agent: string }>;
  agents?: Array<{ id: string; name: string; role: string }>;
}

export interface TraceStats {
  run_id: string;
  total_traces: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_duration_ms: number;
  trace_type_counts: Record<string, number>;
}

export interface AgentXp {
  id: string;
  agent_archetype: string;
  total_xp: number;
  level: number;
  level_name: string;
  steps_completed: number;
  steps_failed: number;
  avg_duration_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
  success_rate: number;
  current_streak: number;
  best_streak: number;
  created_at: string;
  updated_at: string;
}
