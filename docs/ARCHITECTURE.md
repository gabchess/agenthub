# AgentHub Architecture

## System Overview

```
┌─────────┐     ┌──────────────┐     ┌────────┐     ┌───────┐     ┌────────────┐
│   CLI   │ ──▶ │ Orchestrator │ ──▶ │ Agents │ ──▶ │ Tools │ ──▶ │ Blockchain │
└─────────┘     └──────────────┘     └────────┘     └───────┘     └────────────┘
                       │                  │              │
                       ▼                  ▼              ▼
                 ┌──────────┐      ┌───────────┐   ┌─────────┐
                 │ SQLite   │      │ Guardrails│   │ Traces  │
                 │ (WAL)    │      │           │   │ (dual)  │
                 └──────────┘      └───────────┘   └─────────┘
```

## Key Components

### Workflows

YAML-defined execution plans with ordered or parallel steps. Each step is assigned to an agent with specific capabilities.

```yaml
agents:
  - id: agenthub/scout
    role: scanning
    model: claude-sonnet-4-5-20250929
    thinking: medium

steps:
  - id: scan-markets
    agent: agenthub/scout
    input: "Scan DEX markets for {{token_pair}}"
    expects: "TOKENS_FOUND: <count>"
```

### Steps

The unit of work. Steps flow through a state machine:

```
waiting → running → done
                  → failed (→ retry → running)
```

- **Single steps**: Execute once with a specific agent
- **Loop steps**: Iterate over stories with per-story retry
- **On-chain verify steps**: Verify agent output against blockchain state

### Agents

AI model instances with assigned roles. Each agent has:
- A role (scanning, analysis, verification, coding, testing)
- A model configuration (model name, thinking level)
- Guardrails (tool allowlists, spending caps)

### Guardrails

Per-agent security constraints stored in `agent_guardrails` table:

| Constraint | Description |
|-----------|-------------|
| `toolAllowlist` | Only these tools can be used |
| `toolDenylist` | These tools are blocked |
| `maxSpendPerTx` | Max native token per single transaction |
| `maxSpendPerRun` | Max native token total per run |
| `approvalThreshold` | Require human approval above this amount |
| `requireSimulation` | Must simulate before executing |

### Traces

Every action is traced with dual-write to SQLite + JSONL files. 14 trace types:

| Type | Description |
|------|-------------|
| `step.claim` | Agent claimed a step |
| `step.complete` | Step finished successfully |
| `step.fail` | Step failed |
| `model.request` | LLM API called |
| `model.response` | LLM response received |
| `tool.call` | Tool invoked |
| `tool.result` | Tool result received |
| `guardrail.check` | Guardrail validation |
| `guardrail.block` | Action blocked by guardrail |
| `approval.request` | Approval requested |
| `approval.granted` | Approval granted |
| `wallet.tx` | Wallet transaction submitted |
| `state.read` | State layer read |
| `state.write` | State layer write |

## Payments

### Native Transactions (Monad)

Agents can submit transactions on Monad using the wallet tools. Transactions are:
- Simulated before execution (when guardrails require it)
- Subject to per-tx and per-run spending caps
- Logged as `wallet.tx` traces
- Submitted in parallel using local nonce tracking

### x402 Micropayments (Base)

Agents can pay for x402-enabled APIs using USDC on Base. The `x402_pay` tool:

1. Probes a URL with native `fetch`
2. If the server returns HTTP 402, parses payment requirements from headers
3. Checks payment against `maxPaymentUsd` cap and guardrail spending limits
4. Signs an EIP-3009 USDC transfer via `x402-fetch`
5. Retries the request with the signed payment
6. Records a `wallet.tx` trace with `data.type = 'x402'`

The dashboard displays x402 payments with a cyan "x402" badge and aggregates spending in the wallets page.

**Environment variables:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `X402_PRIVATE_KEY` | Yes* | — | Private key for Base wallet |
| `X402_NETWORK` | No | `base-sepolia` | `base` for mainnet |

*Falls back to `MONAD_PRIVATE_KEY` if not set.

### x402-earn (Future)

Agent-to-agent payments where agents can charge for their services. Deferred — would require Express middleware and facilitator setup. AgentHub currently uses a raw Node.js HTTP server.

## Database

SQLite with WAL journaling mode. 6 core tables:

| Table | Description |
|-------|-------------|
| `runs` | Workflow execution instances |
| `steps` | Individual step records with state machine |
| `stories` | Loop iteration records |
| `execution_traces` | All trace events (14 types) |
| `agent_guardrails` | Per-agent security constraints |
| `agent_state` | Agent filesystem state snapshots |

## Dashboard

Next.js frontend served alongside the Node.js HTTP server. Features:
- Real-time run monitoring via SSE
- Wallet transaction history with x402 payment tracking
- Agent XP leaderboard
- Pipeline status and block metrics
- Guardrail configuration display

Deployed to Vercel as `agenthub-dash`.
