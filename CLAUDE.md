# CLAUDE.md — AgentHub

## What is AgentHub?
Production-grade AI agent orchestration platform for Monad. Framework-agnostic, crypto-native, observable by default.

**One-liner:** "The platform where AI agent teams build, audit, and trade on Monad — with shared memory, wallet primitives, and observable execution."

## Architecture
- **Runtime:** Node.js 22+ TypeScript (ESM only)
- **State:** SQLite via `node:sqlite` (WAL journaling, 6 core tables: runs, steps, stories, execution_traces, agent_guardrails, agent_state)
- **Blockchain:** Monad RPC with parallel execution via viem
- **Orchestration:** YAML workflow definitions, cron-based agent triggers, step-claiming state machine
- **Tracing:** Dual-write (SQLite + JSONL) with 14 trace types + real-time SSE
- **Dashboard:** Next.js frontend served via Node.js HTTP server
- **Built on:** Antfarm orchestration core (~800 LOC state machine in step-ops.ts)

## Core Design Principles
1. **Filesystem as state** — /agents, /workflows, /traces, /wallets. Agents read/write files as their state layer.
2. **Observable by default** — Every agent action logged with timestamp, inputs, outputs. 14 trace types.
3. **Crypto-native primitives** — Wallet balance, DEX price feeds, contract reads, tx building are built-in tools.
4. **Framework-agnostic** — Works with any AI model. Infrastructure, not a framework.
5. **Guardrails first** — Per-agent tool allowlists, spending caps, approval thresholds.

## Key Patterns
- **Step claiming:** Agents claim pending steps, execute, complete/fail with retry logic
- **Template resolution:** `{{key}}` placeholders resolved from run context + prior step outputs
- **Story-based loops:** Loop steps iterate over stories with per-story retry and verify-each
- **Parallel execution:** Local nonce tracking for Monad's parallel EVM, Promise.all() submission
- **On-chain verification:** Steps can verify agent output against blockchain state

## Workflow YAML Spec
- agents: list with roles, models, thinking levels (low/medium/high)
- steps: ordered or parallel execution
- step types: single, loop, on_chain_verify
- guardrails: per-agent constraints (max spend, tool allowlist, human approval threshold)
- context: shared key-value state merged from step outputs

## Code Style
- TypeScript strict mode, ESM imports only (no CommonJS)
- viem for blockchain interactions
- node:test for testing
- Never swallow errors silently — log context + rethrow

## Vercel Deployment
- **Project:** `agenthub-dash` — this is the ONLY project. Never create new Vercel projects.
- **Production URL:** https://agenthub-dash.vercel.app
- **Before deploying:** Always run `npx vercel link --project agenthub-dash` from `dashboard/`
- **Deploy command:** `npx vercel --prod --yes`
- **Root directory:** `dashboard` (set in vercel.json)

## Don't Do
- Don't use CommonJS require()
- Don't store secrets in code (use .env)
- Don't make wallet transactions without simulation first
- Don't ignore TypeScript errors
- Don't write agent logic tied to one model provider
- Don't create new Vercel projects — always deploy to `agenthub-dash`

## Lessons Learned
- After every correction: update this file
- Always verify changes applied (git diff + test)
- Use subagents for parallel module builds
- Plan Mode first for complex tasks
