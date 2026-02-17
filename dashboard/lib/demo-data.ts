import type {
  Run,
  Step,
  Story,
  Trace,
  Guardrail,
  AgentXp,
  Workflow,
  TraceType,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers – timestamps relative to NOW so the dashboard always looks fresh
// ---------------------------------------------------------------------------
function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

// Deterministic UUIDs (look real, never change between renders)
const ids = {
  run1: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  run2: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  run3: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  step: (run: number, idx: number) =>
    `${["a1b2", "b2c3", "c3d4"][run - 1]}s${idx}-0000-0000-0000-step0000000${idx}`,
  trace: (i: number) =>
    `trace-${String(i).padStart(4, "0")}-0000-0000-0000-000000000000`,
  story: (i: number) =>
    `story-${String(i).padStart(4, "0")}-0000-0000-0000-000000000000`,
  guardrail: (i: number) =>
    `guard-${String(i).padStart(4, "0")}-0000-0000-0000-000000000000`,
};

const TX_HASH_1 =
  "0x7a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";
const TX_HASH_2 =
  "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e";
const TRACE_HASH_1 =
  "0xabc123def456789012345678901234567890abcdef1234567890abcdef12345678";
const TRACE_HASH_2 =
  "0xdef456abc789012345678901234567890123456789abcdef0123456789abcdef01";
const TRACE_HASH_3 =
  "0x789abc012def345678901234567890123456789012abcdef3456789012abcdef34";

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------
export const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: "token-monitor",
    name: "Token Monitor",
    steps: [
      { id: "scan-markets", agent: "agenthub/scout" },
      { id: "analyze-data", agent: "agenthub/analyst" },
      { id: "verify-signals", agent: "agenthub/guardian" },
      { id: "execute-strategy", agent: "agenthub/coder" },
      { id: "validate-output", agent: "agenthub/tester" },
    ],
    agents: [
      { id: "agenthub/scout", name: "Scout", role: "scanning" },
      { id: "agenthub/analyst", name: "Analyst", role: "analysis" },
      { id: "agenthub/guardian", name: "Guardian", role: "verification" },
      { id: "agenthub/coder", name: "Coder", role: "coding" },
      { id: "agenthub/tester", name: "Tester", role: "testing" },
    ],
  },
  {
    id: "defi-audit",
    name: "DeFi Audit Pipeline",
    steps: [
      { id: "scan-contracts", agent: "agenthub/scout" },
      { id: "analyze-risk", agent: "agenthub/analyst" },
      { id: "verify-safety", agent: "agenthub/guardian" },
    ],
    agents: [
      { id: "agenthub/scout", name: "Scout", role: "scanning" },
      { id: "agenthub/analyst", name: "Analyst", role: "analysis" },
      { id: "agenthub/guardian", name: "Guardian", role: "verification" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
function makeStep(
  run: number,
  idx: number,
  stepId: string,
  agentId: string,
  status: Step["status"],
  output?: string,
  extra?: Partial<Step>
): Step {
  const runId = [ids.run1, ids.run2, ids.run3][run - 1];
  return {
    id: ids.step(run, idx),
    run_id: runId,
    step_id: stepId,
    agent_id: agentId,
    step_index: idx,
    input_template: `Execute {{task}} for step ${stepId}`,
    expects: "KEY: value",
    status,
    output,
    retry_count: 0,
    max_retries: 3,
    type: "single",
    created_at: ago(2 * HOUR - idx * 8 * MIN),
    updated_at: ago(2 * HOUR - idx * 8 * MIN - 5 * MIN),
    ...extra,
  };
}

// Run 1 — completed (token-monitor, finished 30 min ago)
const run1Steps: Step[] = [
  makeStep(1, 0, "scan-markets", "agenthub/scout", "done",
    "TOKENS_FOUND: 14\nTOP_MOVERS: MON/USDC (+12.4%), WETH/MON (+8.7%), DAK/MON (+5.2%)\nVOLUME: $2.4M aggregate across 3 DEXs\nDATA_SOURCE: Monad mainnet RPC + CoinGecko API",
    { created_at: ago(2 * HOUR), updated_at: ago(105 * MIN) }),
  makeStep(1, 1, "analyze-data", "agenthub/analyst", "done",
    "SIGNAL_STRENGTH: strong\nCONFIDENCE: 0.87\nRECOMMENDATION: Accumulate MON/USDC on dips below $4.20\nRISK_LEVEL: moderate\nMARKET_REGIME: trending bullish",
    { created_at: ago(105 * MIN), updated_at: ago(90 * MIN) }),
  makeStep(1, 2, "verify-signals", "agenthub/guardian", "done",
    "VERIFIED: true\nCHECKS_PASSED: 5/5\nSIMULATION: no adverse slippage detected\nGUARDRAIL_STATUS: all within bounds\nAPPROVAL: auto-approved (below threshold)",
    { created_at: ago(90 * MIN), updated_at: ago(75 * MIN) }),
  makeStep(1, 3, "execute-strategy", "agenthub/coder", "done",
    "TX_COUNT: 3\nTOTAL_VALUE: 0.45 MON\nAVG_EXECUTION: 230ms\nSLIPPAGE: 0.12%\nSTATUS: all transactions confirmed",
    { created_at: ago(75 * MIN), updated_at: ago(60 * MIN) }),
  makeStep(1, 4, "validate-output", "agenthub/tester", "done",
    "TESTS_PASSED: 8/8\nBALANCE_VERIFIED: true\nP_AND_L: +0.023 MON (+5.1%)\nEXECUTION_QUALITY: excellent\nAUDIT_TRAIL: complete",
    { created_at: ago(60 * MIN), updated_at: ago(45 * MIN) }),
];

// Run 2 — running (token-monitor, started 15 min ago)
const run2Steps: Step[] = [
  makeStep(2, 0, "scan-markets", "agenthub/scout", "done",
    "TOKENS_FOUND: 8\nTOP_MOVERS: WMON/USDC (+3.1%), MON/DAI (+1.8%)\nVOLUME: $1.1M\nDATA_SOURCE: Monad mainnet RPC",
    { created_at: ago(15 * MIN), updated_at: ago(12 * MIN) }),
  makeStep(2, 1, "analyze-data", "agenthub/analyst", "running",
    undefined,
    { created_at: ago(12 * MIN), updated_at: ago(0) }),
  makeStep(2, 2, "verify-signals", "agenthub/guardian", "waiting",
    undefined,
    { created_at: ago(12 * MIN), updated_at: ago(12 * MIN) }),
  makeStep(2, 3, "execute-strategy", "agenthub/coder", "waiting",
    undefined,
    { created_at: ago(12 * MIN), updated_at: ago(12 * MIN) }),
  makeStep(2, 4, "validate-output", "agenthub/tester", "waiting",
    undefined,
    { created_at: ago(12 * MIN), updated_at: ago(12 * MIN) }),
];

// Run 3 — failed (defi-audit, failed 3 hours ago)
const run3Steps: Step[] = [
  makeStep(3, 0, "scan-contracts", "agenthub/scout", "done",
    "CONTRACTS_SCANNED: 23\nHIGH_RISK: 2\nMEDIUM_RISK: 5\nSAFE: 16\nSOURCE: Monad block explorer",
    { created_at: ago(4 * HOUR), updated_at: ago(3.75 * HOUR) }),
  makeStep(3, 1, "analyze-risk", "agenthub/analyst", "done",
    "RISK_SCORE: 7.2/10\nVULNERABILITIES: reentrancy (1), unchecked return (3)\nRECOMMENDATION: flag for manual review",
    { created_at: ago(3.75 * HOUR), updated_at: ago(3.5 * HOUR) }),
  makeStep(3, 2, "verify-safety", "agenthub/guardian", "failed",
    "ERROR: Guardrail exceeded — contract 0x4a2e...9f1c flagged by external audit DB\nBLOCK_REASON: known exploit pattern detected\nACTION: run halted, manual review required",
    { created_at: ago(3.5 * HOUR), updated_at: ago(3.25 * HOUR), retry_count: 2 }),
];

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
export const DEMO_RUNS: Run[] = [
  {
    id: ids.run1,
    workflow_id: "token-monitor",
    task: "Monitor top Monad token pairs and execute accumulation strategy",
    status: "completed",
    context: "{}",
    created_at: ago(2 * HOUR),
    updated_at: ago(45 * MIN),
    trace_hash: TRACE_HASH_1,
    trace_tx_hash: TX_HASH_1,
    trace_committed_at: ago(44 * MIN),
    steps: run1Steps,
  },
  {
    id: ids.run2,
    workflow_id: "token-monitor",
    task: "Scan WMON/USDC pair for arbitrage opportunities",
    status: "running",
    context: "{}",
    created_at: ago(15 * MIN),
    updated_at: ago(0),
    trace_hash: TRACE_HASH_2,
    steps: run2Steps,
  },
  {
    id: ids.run3,
    workflow_id: "defi-audit",
    task: "Audit newly deployed lending protocol contracts on Monad",
    status: "blocked",
    context: "{}",
    created_at: ago(4 * HOUR),
    updated_at: ago(3.25 * HOUR),
    trace_hash: TRACE_HASH_3,
    trace_tx_hash: TX_HASH_2,
    trace_committed_at: ago(3.2 * HOUR),
    steps: run3Steps,
  },
];

// ---------------------------------------------------------------------------
// Stories (for run 1)
// ---------------------------------------------------------------------------
export const DEMO_STORIES: Record<string, Story[]> = {
  [ids.run1]: [
    {
      id: ids.story(1),
      run_id: ids.run1,
      story_index: 0,
      story_id: "market-scan",
      title: "Scan DEX markets for high-volume pairs",
      description: "Identify token pairs with significant volume and price movement",
      acceptance_criteria: "At least 5 pairs identified with >$100k volume",
      status: "done",
      output: "14 pairs found, 3 above threshold",
      retry_count: 0,
      max_retries: 3,
      created_at: ago(2 * HOUR),
      updated_at: ago(105 * MIN),
    },
    {
      id: ids.story(2),
      run_id: ids.run1,
      story_index: 1,
      story_id: "signal-analysis",
      title: "Analyze price signals and market regime",
      description: "Run technical analysis on identified pairs",
      acceptance_criteria: "Confidence score > 0.7 for at least 1 pair",
      status: "done",
      output: "MON/USDC signal confidence: 0.87",
      retry_count: 0,
      max_retries: 3,
      created_at: ago(105 * MIN),
      updated_at: ago(90 * MIN),
    },
    {
      id: ids.story(3),
      run_id: ids.run1,
      story_index: 2,
      story_id: "execution",
      title: "Execute and validate strategy",
      description: "Submit transactions and verify final P&L",
      acceptance_criteria: "All transactions confirmed, positive P&L",
      status: "done",
      output: "3 txs confirmed, P&L: +0.023 MON",
      retry_count: 0,
      max_retries: 3,
      created_at: ago(75 * MIN),
      updated_at: ago(45 * MIN),
    },
  ],
  [ids.run2]: [
    {
      id: ids.story(4),
      run_id: ids.run2,
      story_index: 0,
      story_id: "arb-scan",
      title: "Scan WMON/USDC arbitrage routes",
      description: "Find price discrepancies across Monad DEXs",
      acceptance_criteria: "Identify spreads > 0.3%",
      status: "running",
      retry_count: 0,
      max_retries: 3,
      created_at: ago(15 * MIN),
      updated_at: ago(5 * MIN),
    },
  ],
};

// ---------------------------------------------------------------------------
// Traces
// ---------------------------------------------------------------------------
function makeTrace(
  i: number,
  runId: string,
  type: TraceType,
  agentId: string,
  stepId?: string,
  extra?: Partial<Trace>
): Trace {
  return {
    id: ids.trace(i),
    run_id: runId,
    step_id: stepId,
    agent_id: agentId,
    trace_type: type,
    timestamp: ago(2 * HOUR - i * 3 * MIN),
    duration_ms: 200 + Math.floor(i * 137 % 4800),
    input_tokens: type.startsWith("model") ? 1200 + (i * 311 % 3000) : undefined,
    output_tokens: type.startsWith("model") ? 400 + (i * 197 % 2000) : undefined,
    model: type.startsWith("model") ? "claude-sonnet-4-5-20250929" : undefined,
    data: "{}",
    created_at: ago(2 * HOUR - i * 3 * MIN),
    ...extra,
  };
}

export const DEMO_TRACES: Trace[] = [
  makeTrace(1, ids.run1, "step.claim", "agenthub/scout", ids.step(1, 0)),
  makeTrace(2, ids.run1, "model.request", "agenthub/scout", ids.step(1, 0)),
  makeTrace(3, ids.run1, "tool.call", "agenthub/scout", ids.step(1, 0)),
  makeTrace(4, ids.run1, "tool.result", "agenthub/scout", ids.step(1, 0)),
  makeTrace(5, ids.run1, "model.response", "agenthub/scout", ids.step(1, 0)),
  makeTrace(6, ids.run1, "step.complete", "agenthub/scout", ids.step(1, 0)),
  makeTrace(7, ids.run1, "step.claim", "agenthub/analyst", ids.step(1, 1)),
  makeTrace(8, ids.run1, "model.request", "agenthub/analyst", ids.step(1, 1)),
  makeTrace(9, ids.run1, "model.response", "agenthub/analyst", ids.step(1, 1)),
  makeTrace(10, ids.run1, "step.complete", "agenthub/analyst", ids.step(1, 1)),
  makeTrace(11, ids.run1, "step.claim", "agenthub/guardian", ids.step(1, 2)),
  makeTrace(12, ids.run1, "guardrail.check", "agenthub/guardian", ids.step(1, 2)),
  makeTrace(13, ids.run1, "model.request", "agenthub/guardian", ids.step(1, 2)),
  makeTrace(14, ids.run1, "model.response", "agenthub/guardian", ids.step(1, 2)),
  makeTrace(15, ids.run1, "step.complete", "agenthub/guardian", ids.step(1, 2)),
  makeTrace(16, ids.run1, "step.claim", "agenthub/coder", ids.step(1, 3)),
  makeTrace(17, ids.run1, "wallet.tx", "agenthub/coder", ids.step(1, 3), {
    data: JSON.stringify({ from: "0x1a2b...3c4d", to: "0x5e6f...7a8b", value: "0.15 MON", txHash: TX_HASH_1 }),
  }),
  makeTrace(18, ids.run1, "wallet.tx", "agenthub/coder", ids.step(1, 3), {
    data: JSON.stringify({ from: "0x1a2b...3c4d", to: "0x9c0d...1e2f", value: "0.15 MON", txHash: TX_HASH_2 }),
  }),
  makeTrace(19, ids.run1, "step.complete", "agenthub/coder", ids.step(1, 3)),
  makeTrace(20, ids.run1, "step.claim", "agenthub/tester", ids.step(1, 4)),
  makeTrace(21, ids.run1, "model.request", "agenthub/tester", ids.step(1, 4)),
  makeTrace(22, ids.run1, "model.response", "agenthub/tester", ids.step(1, 4)),
  makeTrace(23, ids.run1, "step.complete", "agenthub/tester", ids.step(1, 4)),
  // Run 2 traces (running)
  makeTrace(24, ids.run2, "step.claim", "agenthub/scout", ids.step(2, 0), { timestamp: ago(15 * MIN) }),
  makeTrace(25, ids.run2, "model.request", "agenthub/scout", ids.step(2, 0), { timestamp: ago(14 * MIN) }),
  makeTrace(26, ids.run2, "tool.call", "agenthub/scout", ids.step(2, 0), { timestamp: ago(13.5 * MIN) }),
  makeTrace(27, ids.run2, "tool.result", "agenthub/scout", ids.step(2, 0), { timestamp: ago(13 * MIN) }),
  makeTrace(28, ids.run2, "model.response", "agenthub/scout", ids.step(2, 0), { timestamp: ago(12.5 * MIN) }),
  makeTrace(29, ids.run2, "step.complete", "agenthub/scout", ids.step(2, 0), { timestamp: ago(12 * MIN) }),
  makeTrace(30, ids.run2, "step.claim", "agenthub/analyst", ids.step(2, 1), { timestamp: ago(12 * MIN) }),
  makeTrace(31, ids.run2, "model.request", "agenthub/analyst", ids.step(2, 1), { timestamp: ago(11 * MIN) }),
  // Run 3 traces (failed)
  makeTrace(32, ids.run3, "step.claim", "agenthub/scout", ids.step(3, 0), { timestamp: ago(4 * HOUR) }),
  makeTrace(33, ids.run3, "step.complete", "agenthub/scout", ids.step(3, 0), { timestamp: ago(3.75 * HOUR) }),
  makeTrace(34, ids.run3, "step.claim", "agenthub/analyst", ids.step(3, 1), { timestamp: ago(3.75 * HOUR) }),
  makeTrace(35, ids.run3, "step.complete", "agenthub/analyst", ids.step(3, 1), { timestamp: ago(3.5 * HOUR) }),
  makeTrace(36, ids.run3, "step.claim", "agenthub/guardian", ids.step(3, 2), { timestamp: ago(3.5 * HOUR) }),
  makeTrace(37, ids.run3, "guardrail.check", "agenthub/guardian", ids.step(3, 2), { timestamp: ago(3.4 * HOUR) }),
  makeTrace(38, ids.run3, "guardrail.block", "agenthub/guardian", ids.step(3, 2), { timestamp: ago(3.3 * HOUR) }),
  makeTrace(39, ids.run3, "step.fail", "agenthub/guardian", ids.step(3, 2), { timestamp: ago(3.25 * HOUR) }),
];

// ---------------------------------------------------------------------------
// Agent XP
// ---------------------------------------------------------------------------
export const DEMO_AGENT_XP: AgentXp[] = [
  {
    id: "xp-1",
    agent_archetype: "scout",
    total_xp: 2450,
    level: 4,
    level_name: "Elite",
    steps_completed: 47,
    steps_failed: 2,
    avg_duration_ms: 8400,
    total_input_tokens: 142000,
    total_output_tokens: 38000,
    success_rate: 9592,
    current_streak: 12,
    best_streak: 19,
    created_at: ago(14 * DAY),
    updated_at: ago(15 * MIN),
  },
  {
    id: "xp-2",
    agent_archetype: "analyst",
    total_xp: 5200,
    level: 4,
    level_name: "Elite",
    steps_completed: 89,
    steps_failed: 5,
    avg_duration_ms: 12300,
    total_input_tokens: 384000,
    total_output_tokens: 96000,
    success_rate: 9468,
    current_streak: 8,
    best_streak: 23,
    created_at: ago(14 * DAY),
    updated_at: ago(12 * MIN),
  },
  {
    id: "xp-3",
    agent_archetype: "guardian",
    total_xp: 1800,
    level: 3,
    level_name: "Veteran",
    steps_completed: 34,
    steps_failed: 3,
    avg_duration_ms: 6200,
    total_input_tokens: 98000,
    total_output_tokens: 24000,
    success_rate: 9189,
    current_streak: 5,
    best_streak: 14,
    created_at: ago(14 * DAY),
    updated_at: ago(3.25 * HOUR),
  },
  {
    id: "xp-4",
    agent_archetype: "coder",
    total_xp: 11200,
    level: 5,
    level_name: "Legend",
    steps_completed: 156,
    steps_failed: 8,
    avg_duration_ms: 15800,
    total_input_tokens: 720000,
    total_output_tokens: 280000,
    success_rate: 9512,
    current_streak: 22,
    best_streak: 31,
    created_at: ago(14 * DAY),
    updated_at: ago(60 * MIN),
  },
  {
    id: "xp-5",
    agent_archetype: "tester",
    total_xp: 680,
    level: 2,
    level_name: "Apprentice",
    steps_completed: 18,
    steps_failed: 1,
    avg_duration_ms: 9100,
    total_input_tokens: 54000,
    total_output_tokens: 16000,
    success_rate: 9473,
    current_streak: 6,
    best_streak: 11,
    created_at: ago(7 * DAY),
    updated_at: ago(45 * MIN),
  },
];

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------
export const DEMO_GUARDRAILS: Guardrail[] = [
  {
    id: ids.guardrail(1),
    agent_id: "agenthub/scout",
    tool_allowlist: JSON.stringify(["fetch_prices", "scan_contracts", "read_state"]),
    max_spend_per_tx: "0",
    require_simulation: false,
    created_at: ago(14 * DAY),
    updated_at: ago(14 * DAY),
  },
  {
    id: ids.guardrail(2),
    agent_id: "agenthub/analyst",
    tool_allowlist: JSON.stringify(["read_state", "compute_signal", "fetch_prices"]),
    max_spend_per_tx: "0",
    require_simulation: false,
    created_at: ago(14 * DAY),
    updated_at: ago(14 * DAY),
  },
  {
    id: ids.guardrail(3),
    agent_id: "agenthub/guardian",
    tool_allowlist: JSON.stringify(["verify_tx", "check_guardrails", "read_state", "simulate_tx"]),
    max_spend_per_tx: "0",
    approval_threshold: "0.5 MON",
    require_simulation: true,
    created_at: ago(14 * DAY),
    updated_at: ago(14 * DAY),
  },
  {
    id: ids.guardrail(4),
    agent_id: "agenthub/coder",
    tool_allowlist: JSON.stringify(["submit_tx", "read_state", "simulate_tx", "build_tx"]),
    tool_denylist: JSON.stringify(["approve_unlimited"]),
    max_spend_per_tx: "1.0 MON",
    max_spend_per_run: "5.0 MON",
    approval_threshold: "2.0 MON",
    require_simulation: true,
    parallel_allowed: true,
    created_at: ago(14 * DAY),
    updated_at: ago(14 * DAY),
  },
  {
    id: ids.guardrail(5),
    agent_id: "agenthub/tester",
    tool_allowlist: JSON.stringify(["read_state", "verify_balance", "check_tx_receipt"]),
    max_spend_per_tx: "0",
    require_simulation: false,
    created_at: ago(14 * DAY),
    updated_at: ago(14 * DAY),
  },
];

// ---------------------------------------------------------------------------
// Wallet traces (for wallet page)
// ---------------------------------------------------------------------------
export const DEMO_WALLET_TRACES: Trace[] = [
  makeTrace(101, ids.run1, "wallet.tx", "agenthub/coder", ids.step(1, 3), {
    timestamp: ago(65 * MIN),
    data: JSON.stringify({
      from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      to: "0x9876543210fedcba9876543210fedcba98765432",
      value: "0.15 MON",
      txHash: TX_HASH_1,
    }),
  }),
  makeTrace(102, ids.run1, "wallet.tx", "agenthub/coder", ids.step(1, 3), {
    timestamp: ago(63 * MIN),
    data: JSON.stringify({
      from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      to: "0xabcdef1234567890abcdef1234567890abcdef12",
      value: "0.15 MON",
      txHash: TX_HASH_2,
    }),
  }),
  makeTrace(103, ids.run1, "wallet.tx", "agenthub/coder", ids.step(1, 3), {
    timestamp: ago(61 * MIN),
    data: JSON.stringify({
      from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      to: "0xfedcba9876543210fedcba9876543210fedcba98",
      value: "0.15 MON",
      txHash: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
    }),
  }),
  // x402 payment traces
  makeTrace(104, ids.run1, "wallet.tx", "agenthub/scout", ids.step(1, 0), {
    timestamp: ago(110 * MIN),
    data: JSON.stringify({
      type: "x402",
      from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      value: "0.01 USDC",
      asset: "USDC",
      network: "base-sepolia",
      url: "https://api.marketdata.io/v1/monad/prices",
      amount: 0.01,
    }),
  }),
  makeTrace(105, ids.run2, "wallet.tx", "agenthub/scout", ids.step(2, 0), {
    timestamp: ago(14 * MIN),
    data: JSON.stringify({
      type: "x402",
      from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      value: "0.02 USDC",
      asset: "USDC",
      network: "base-sepolia",
      url: "https://api.marketdata.io/v1/monad/orderbook",
      amount: 0.02,
    }),
  }),
  makeTrace(106, ids.run1, "wallet.tx", "agenthub/analyst", ids.step(1, 1), {
    timestamp: ago(95 * MIN),
    data: JSON.stringify({
      type: "x402",
      from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      to: "0xAb5801a7D398351b8bE11C439e05C5b3259aeC9B",
      value: "0.05 USDC",
      asset: "USDC",
      network: "base-sepolia",
      url: "https://api.defi-analytics.io/v2/signals",
      amount: 0.05,
    }),
  }),
];

// ---------------------------------------------------------------------------
// Block metrics (for pipeline page)
// ---------------------------------------------------------------------------
export const DEMO_BLOCKS = [
  {
    block_number: 18_432_891,
    block_hash: "0x3f8a7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    timestamp: Math.floor(Date.now() / 1000) - 2,
    gas_used: "12500000",
    gas_limit: "30000000",
    base_fee_per_gas: "25000000000",
    transaction_count: 142,
    block_time_ms: 400,
  },
  {
    block_number: 18_432_890,
    block_hash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    timestamp: Math.floor(Date.now() / 1000) - 3,
    gas_used: "11800000",
    gas_limit: "30000000",
    base_fee_per_gas: "24000000000",
    transaction_count: 128,
    block_time_ms: 410,
  },
];

// ---------------------------------------------------------------------------
// Price snapshots (for pipeline page)
// ---------------------------------------------------------------------------
export const DEMO_PRICES = [
  // MON/USDC - recent snapshots (most recent first)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `price-mon-${i}`,
    chain_id: "monad",
    token_address: "0x4200000000000000000000000000000000000001",
    price_usd: String(4.12 + Math.sin(i * 0.5) * 0.18),
    price_native: "1.0",
    volume_24h: "2400000",
    liquidity_usd: "12800000",
    price_change_24h: "12.4",
    source: "dex-subgraph",
    created_at: ago(i * 5 * MIN),
  })),
  // WETH/MON
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `price-weth-${i}`,
    chain_id: "monad",
    token_address: "0x4200000000000000000000000000000000000006",
    price_usd: String(3210 + Math.sin(i * 0.4) * 45),
    price_native: "780.2",
    volume_24h: "890000",
    liquidity_usd: "5200000",
    price_change_24h: "8.7",
    source: "dex-subgraph",
    created_at: ago(i * 5 * MIN),
  })),
  // DAK/MON
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `price-dak-${i}`,
    chain_id: "monad",
    token_address: "0x8800000000000000000000000000000000000042",
    price_usd: String(0.087 + Math.sin(i * 0.6) * 0.004),
    price_native: "0.021",
    volume_24h: "340000",
    liquidity_usd: "980000",
    price_change_24h: "-2.1",
    source: "coingecko",
    created_at: ago(i * 5 * MIN),
  })),
];

// ---------------------------------------------------------------------------
// Balance snapshots (for pipeline page)
// ---------------------------------------------------------------------------
export const DEMO_BALANCES = [
  {
    id: "bal-1",
    address: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    balance_wei: "4500000000000000000",
    balance_formatted: "4.50 MON",
    block_number: 18_432_891,
    chain: "monad",
    created_at: ago(2 * MIN),
  },
  {
    id: "bal-2",
    address: "0x9876543210fedcba9876543210fedcba98765432",
    balance_wei: "12300000000000000000",
    balance_formatted: "12.30 MON",
    block_number: 18_432_890,
    chain: "monad",
    created_at: ago(5 * MIN),
  },
  {
    id: "bal-3",
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    balance_wei: "890000000000000000",
    balance_formatted: "0.89 MON",
    block_number: 18_432_889,
    chain: "monad",
    created_at: ago(8 * MIN),
  },
];

// ---------------------------------------------------------------------------
// Pipeline status
// ---------------------------------------------------------------------------
export const DEMO_PIPELINE_STATUS = [
  {
    source: "monad-rpc",
    status: "running",
    last_poll_at: ago(2000),
    last_success_at: ago(2000),
    last_error: null,
    error_count: 0,
    success_count: 14280,
    records_ingested: 14280,
    poll_interval_ms: 1000,
    avg_duration_ms: 120,
  },
  {
    source: "coingecko",
    status: "running",
    last_poll_at: ago(5000),
    last_success_at: ago(5000),
    last_error: "Rate limit exceeded (429)",
    error_count: 2,
    success_count: 890,
    records_ingested: 892,
    poll_interval_ms: 5000,
    avg_duration_ms: 340,
  },
  {
    source: "dex-subgraph",
    status: "running",
    last_poll_at: ago(3000),
    last_success_at: ago(3000),
    last_error: null,
    error_count: 0,
    success_count: 3420,
    records_ingested: 3420,
    poll_interval_ms: 2000,
    avg_duration_ms: 180,
  },
];
