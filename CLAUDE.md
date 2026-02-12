# CLAUDE.md — AgentHub

## What is AgentHub?
Production-grade AI agent orchestration platform for Monad. Framework-agnostic, crypto-native, observable by default.

**One-liner:** "The platform where AI agent teams build, audit, and trade on Monad — with shared memory, wallet primitives, and observable execution."

## Architecture
- **Runtime:** Node.js + TypeScript
- **State:** Supabase PostgreSQL (20+ tables, 4-table core: proposals → missions → steps → events)
- **Blockchain:** Monad RPC with parallel execution, ethers.js v6
- **Wallets:** Hot/cold wallet separation, Gnosis Safe multi-sig for high-value ops
- **Security:** Tenderly simulation before execution, Flashbots MEV protection
- **Orchestration:** YAML workflow definitions, SQLite local state, cron-based triggers
- **Built on:** Antfarm (3,765 LOC, proven in production)

## Core Design Principles
1. **Filesystem as state** — /agents, /workflows, /traces, /wallets. Agents read/write files as their state layer.
2. **Observable by default** — Every agent action logged with timestamp, inputs, outputs.
3. **Crypto-native primitives** — Wallet balance, DEX price feeds, contract reads, tx building are built-in tools.
4. **Framework-agnostic** — Works with any AI model. Infrastructure, not a framework.
5. **Guardrails first** — Per-agent tool allowlists, spending caps, approval thresholds.

## Workflow YAML Spec
- agents: list with roles, models, effort levels (low/medium/high)
- steps: ordered or parallel execution
- guardrails: per-agent constraints (max spend, tool allowlist, human approval threshold)
- triggers: cron, webhook, or event-based
- Step types: prompt, tool_call, on_chain_verify, human_review, conditional

## Code Style
- TypeScript strict mode, ESM imports (no CommonJS)
- Zod for runtime validation
- Never swallow errors silently. Log context + rethrow.
- Tests: Vitest. Every new module needs tests.

## Don't Do
- Don't use CommonJS require()
- Don't store secrets in code (use .env)
- Don't make wallet transactions without simulation first
- Don't ignore TypeScript errors
- Don't write agent logic tied to one model provider

## Lessons Learned
- After every correction: update this file
- Always verify changes applied (git diff + test)
- Use subagents for parallel module builds
- Plan Mode first for complex tasks
