# AgentHub

**The platform where AI agent teams build, audit, and trade on Monad — with shared memory, wallet primitives, and observable execution.**

Production-grade AI agent orchestration for Monad blockchain. Framework-agnostic, crypto-native, observable by default.

---

## The Problem

Multi-agent AI systems are moving on-chain (ai16z: $2B market cap, Olas: 700K tx/month), but they face three critical bottlenecks:

1. **No shared infrastructure** — Every team rebuilds wallet management, transaction safety, and monitoring from scratch.
2. **Blockchain throughput limits** — Ethereum's 15 TPS cannot support agent swarms that need hundreds of concurrent transactions.
3. **No observability** — When an agent team makes a bad trade, there's no audit trail to understand why.

AgentHub solves all three by providing a **production-grade orchestration platform** built natively on Monad's 10,000 TPS parallel execution engine. What costs $18,000 in gas on Ethereum costs $0.68 on Monad. What takes 12 minutes of sequential transactions completes in 400ms with parallel execution.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLI (antfarm)                                 │
│   install · run · status · logs · dashboard · step claim/complete    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                   WORKFLOW ENGINE                                     │
│                                                                      │
│   YAML Spec ──► Installer ──► Run (SQLite) ──► Steps ──► Events     │
│                                                                      │
│   Step types: prompt │ tool_call │ on_chain_verify │ human_review    │
│   Loop support: story-based decomposition with verify-each           │
│   Parallel execution: concurrent agent steps with group sequencing   │
└──────┬───────────────┬────────────────┬──────────────────────────────┘
       │               │                │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────────────────────────────┐
│ Agent Teams │ │  Guardrails │ │   Blockchain Layer (Monad)           │
│             │ │             │ │                                      │
│ - Scout     │ │ - Allowlist │ │  MonadClient (viem)                  │
│ - Analyst   │ │ - Spend cap │ │  ├── wallet_balance (parallel)      │
│ - Guardian  │ │ - Approval  │ │  ├── token_price (DexScreener)      │
│ - Developer │ │ - Simulate  │ │  ├── contract_read (ERC20/721)      │
│ - Verifier  │ │             │ │  └── submitParallelTransactions()   │
└─────────────┘ └─────────────┘ └─────────────────────────────────────┘
       │                                       │
┌──────▼───────────────────────────────────────▼──────────────────────┐
│                     REAL-TIME PIPELINE                               │
│                                                                      │
│   BlockCollector (2s) ──┐                                           │
│   BalanceCollector (10s)┤                                           │
│   PriceCollector (60s) ─┼──► SQLite (WAL) ──► REST API + SSE       │
│   ContractCollector(30s)┤        │                                  │
│   HealthMonitor (5s) ───┘        ▼                                  │
│                           Dashboard (Next.js :3001)                  │
│                           API Server (:3333)                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Agent Orchestration
- **YAML-defined workflows** — Declarative multi-agent pipelines with step ordering, retries, and escalation
- **Story-based loops** — Decompose large tasks into user stories, execute with verify-each
- **Parallel step execution** — Concurrent agent groups with dependency sequencing
- **Agent identity system** — Each agent has IDENTITY.md (personality), SOUL.md (motivation), AGENTS.md (capabilities)
- **Framework-agnostic** — Works with any AI model provider (Claude, GPT, Llama, etc.)

### Crypto-Native Primitives
- **Monad-optimized client** — Parallel transaction submission via `Promise.all()`, local nonce tracking, 800ms finality
- **Wallet balance monitoring** — Parallel multi-address balance queries with caching
- **Token price feeds** — DexScreener API integration with retry logic and exponential backoff
- **Contract reads** — Auto-detected ERC20/ERC721 ABIs, decoded return values
- **Tool registry** — Unified `invokeChainTool()` interface for all blockchain operations

### Security & Guardrails
- **Per-agent tool allowlists** — Control exactly which tools each agent can access
- **Spending caps** — Max spend per transaction and per run
- **Approval thresholds** — Human-in-the-loop for high-value operations
- **Transaction simulation** — Tenderly simulation before execution
- **Hot/cold wallet separation** — Gnosis Safe multi-sig for high-value ops

### Real-Time Pipeline
- **Standalone ETL daemon** — Continuously extracts blockchain data, crash-isolated from agents
- **5 data collectors** — Blocks, balances, prices, contract state, health monitoring
- **Circuit breaker pattern** — Per-collector isolation (Monad RPC down doesn't affect DexScreener)
- **SSE streaming** — Real-time event push to dashboard (no WebSocket dependency)
- **Automatic retention** — Configurable row limits with periodic cleanup

### Observable Dashboard
- **Dark terminal UI** — Professional monitoring aesthetic built with Next.js + Tailwind
- **Live block ticker** — Auto-updating block number, gas price, TPS
- **Token price cards** — Real-time prices with 24h change indicators and mini bar charts
- **Wallet balance table** — Monitored addresses with live balance updates
- **Execution traces** — Every agent action logged with timestamp, inputs, outputs
- **Run management** — View workflow runs, steps, stories, and their statuses

---

## Quick Start

### Prerequisites

- **Node.js >= 22** (with native `node:sqlite` support)
- **npm** (included with Node.js)
- **Git**

### Install

```bash
# Clone the repository
git clone https://github.com/gabchess/agenthub.git
cd agenthub

# Install dependencies
npm install

# Build
npm run build

# Install all workflows (creates agent crons + starts dashboard)
node dist/cli/cli.js install
```

### Start the Dashboard

```bash
# Start dashboard server (port 3333) + Next.js frontend (port 3001)
node dist/cli/cli.js dashboard start

# Dashboard API:  http://localhost:3333
# Dashboard UI:   http://localhost:3001
```

### Start the Pipeline

```bash
# Start the real-time data pipeline daemon
node dist/pipeline/daemon.js

# Verify it's collecting data
curl http://localhost:3333/api/pipeline/status
curl http://localhost:3333/api/pipeline/blocks?limit=5

# Watch SSE events stream
curl -N http://localhost:3333/api/pipeline/stream
```

### Run a Workflow

```bash
# List available workflows
node dist/cli/cli.js workflow list

# Run the DeFi Sentinel demo
node dist/cli/cli.js workflow run defi-sentinel "Monitor Monad testnet for threats"

# Check status
node dist/cli/cli.js workflow status defi-sentinel

# View logs
node dist/cli/cli.js logs
```

---

## Demo: DeFi Sentinel

**DeFi Sentinel** is a 3-agent threat monitoring pipeline that demonstrates AgentHub's multi-agent orchestration with real blockchain data.

### The Agents

| Agent | Role | What It Does |
|-------|------|-------------|
| **Scout** | `scanning` | Monitors Monad blocks for large transactions, gas spikes, whale activity |
| **Analyst** | `analysis` | Evaluates token price impact, liquidity risk, manipulation vectors |
| **Guardian** | `analysis` | Synthesizes all intelligence into a threat level (GREEN/YELLOW/ORANGE/RED) |

### Pipeline Flow

```
Scout                    Analyst                  Guardian
  │                        │                        │
  ├─ scan_blocks ─────────►│                        │
  │  (read_state)          │                        │
  │                        │                        │
  ├─ scan_wallets ────────►│                        │
  │  (wallet_balance)      │                        │
  │                        ├─ analyze_price ───────►│
  │                        │  (token_price)         │
  │                        │                        │
  │                        ├─ analyze_contract ────►│
  │                        │  (contract_read)       │
  │                        │                        │
  │                        │    threat_assessment ──►│ REPORT
  │                        │                        │
```

### Steps (5 total, 4 on-chain)

1. **scan_blocks** — Scout reads latest Monad blocks via `read_state`, reports block number, gas, tx count, anomalies
2. **scan_wallets** — Scout checks watched wallet balance via `wallet_balance`, flags whale activity
3. **analyze_price** — Analyst fetches token price via `token_price` (DexScreener), evaluates manipulation risk
4. **analyze_contract** — Analyst reads token totalSupply via `contract_read`, checks for supply anomalies
5. **threat_assessment** — Guardian synthesizes all data into a unified threat report with severity level

### Example Output

```
╔══════════════════════════════════════╗
║     DEFI SENTINEL THREAT REPORT      ║
╚══════════════════════════════════════╝

TIMESTAMP: 2026-02-12T18:30:00Z
THREAT_LEVEL: YELLOW

NETWORK STATUS:
  Block: 1,234,567 | Gas: 2.1 gwei | TPS: ~340
  Activity: ELEVATED

WALLET MONITOR:
  Address: 0x742d...0bEb
  Balance: 45.2 MON
  Whale Alert: NO

MARKET STATUS:
  Token: 0x1234...7890
  Price: $0.0034 | 24h Change: -3.2%
  Volume: $12.4K | Liquidity: $8.7K
  Manipulation Risk: MEDIUM

CONTRACT STATE:
  Supply: 1000000000
  Anomaly: NO

ALERTS TRIGGERED: 1
  [YELLOW] Low liquidity (<$10K) with elevated network activity

RECOMMENDATIONS:
  1. Increase monitoring frequency to 30s intervals
  2. Set limit orders to protect against sudden price drops
  3. Monitor liquidity pool depth over next 4 hours
```

### Run It

```bash
# Install and run
node dist/cli/cli.js workflow install defi-sentinel
node dist/cli/cli.js workflow run defi-sentinel "Full testnet threat scan"

# Watch the agents work
node dist/cli/cli.js logs

# View in dashboard
open http://localhost:3001/runs
```

---

## Available Workflows

| Workflow | Agents | Description |
|----------|--------|-------------|
| **defi-sentinel** | Scout, Analyst, Guardian | Real-time DeFi threat detection and alerting |
| **monad-health-check** | Scanner, Analyzer, Reporter | Blockchain health monitoring and reporting |
| **token-monitor** | Monitor | Token price, balance, and supply tracking |
| **feature-dev** | Planner, Developer, Verifier, Tester, Reviewer | Story-based feature development pipeline |
| **bug-fix** | Triager, Investigator, Fixer | Automated bug investigation and fixing |
| **security-audit** | Scanner, Prioritizer, Fixer, Tester | Security vulnerability scanning and remediation |

---

## Project Structure

```
agenthub/
├── src/
│   ├── cli/                    # CLI entry point (antfarm command)
│   ├── installer/              # Workflow engine (install, run, steps, events)
│   ├── chains/
│   │   ├── monad.ts            # MonadClient (viem, parallel txs, nonce mgmt)
│   │   ├── types.ts            # Blockchain type definitions
│   │   └── tools/
│   │       ├── wallet-balance.ts   # Parallel multi-address balance queries
│   │       ├── token-price.ts      # DexScreener API with retry logic
│   │       ├── contract-read.ts    # Auto-ABI detection, result decoding
│   │       ├── cache.ts            # TTL-based in-memory cache
│   │       └── index.ts            # Tool registry (invokeChainTool)
│   ├── pipeline/
│   │   ├── daemon.ts           # Standalone ETL process with PID management
│   │   ├── orchestrator.ts     # Lifecycle for all collectors
│   │   ├── sse-broadcaster.ts  # SSE event fan-out to dashboard
│   │   ├── db-pipeline.ts      # 5 SQLite tables + typed helpers
│   │   ├── circuit-breaker.ts  # CLOSED → OPEN → HALF_OPEN
│   │   ├── retention.ts        # Periodic old-row cleanup
│   │   └── collectors/         # Block, balance, price, contract, health
│   ├── server/
│   │   └── dashboard.ts        # HTTP API (port 3333) + pipeline routes
│   └── lib/
│       └── logger.ts           # File-based logging with rotation
├── workflows/
│   ├── defi-sentinel/          # 3-agent DeFi threat monitor (demo)
│   ├── monad-health-check/     # Blockchain health monitoring
│   ├── token-monitor/          # Token price tracking
│   ├── feature-dev/            # Story-based development pipeline
│   ├── bug-fix/                # Bug investigation workflow
│   └── security-audit/         # Security scanning workflow
├── dashboard/                  # Next.js frontend (port 3001)
│   ├── app/                    # Pages: runs, agents, traces, wallets, pipeline
│   ├── components/             # UI components (dark terminal aesthetic)
│   └── lib/                    # SWR hooks, utils, types
└── CLAUDE.md                   # AI assistant instructions
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 22+ | Native SQLite, ESM modules, top-level await |
| **Language** | TypeScript (strict) | Type safety with Zod runtime validation |
| **Blockchain** | viem v2 | Monad RPC, EIP-1559 transactions, ABI encoding |
| **Database** | SQLite (node:sqlite) | WAL mode for concurrent reads/writes, zero config |
| **API** | DexScreener | Real-time token prices, volume, liquidity data |
| **Frontend** | Next.js 14 + Tailwind | Dark terminal UI with SWR polling + SSE streaming |
| **Orchestration** | YAML workflows | Declarative agent pipelines with retry/escalation |
| **Caching** | In-memory TTL | Per-tool cache (10s balance, 30s contract, 60s price) |

### Zero Backend Dependencies

The pipeline and API server use only built-in Node.js modules (`node:http`, `node:sqlite`, `node:crypto`, `node:fs`) plus `viem` (blockchain) and `yaml` (config parsing). No Express, no Redis, no Postgres.

---

## Configuration

### Pipeline Configuration

Create `~/.openclaw/antfarm/pipeline.yml`:

```yaml
pipeline:
  blocks:
    enabled: true
    pollIntervalMs: 2000

  balances:
    enabled: true
    pollIntervalMs: 10000
    addresses:
      - "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

  prices:
    enabled: true
    pollIntervalMs: 60000
    tokens:
      - chainId: "monad"
        address: "0x1234567890123456789012345678901234567890"

  contracts:
    enabled: true
    pollIntervalMs: 30000
    targets:
      - contractAddress: "0x1234567890123456789012345678901234567890"
        method: "totalSupply"
        args: []

  retention:
    maxBlockMetrics: 100000
    maxPriceSnapshots: 10000
    cleanupIntervalMs: 300000

  circuitBreaker:
    failureThreshold: 5
    resetTimeoutMs: 30000
```

### Environment Variables

```bash
MONAD_PRIVATE_KEY=0x...          # Optional: wallet for transaction submission
OPENCLAW_STATE_DIR=~/.openclaw    # State directory (default)
NEXT_PUBLIC_API_URL=http://localhost:3333  # Dashboard API URL
```

---

## API Reference

### Workflow API (port 3333)

| Endpoint | Description |
|----------|-------------|
| `GET /api/workflows` | List installed workflows |
| `GET /api/runs` | List all workflow runs |
| `GET /api/runs/:id` | Get run details with steps |
| `GET /api/runs/:id/events` | Get run event timeline |
| `GET /api/runs/:id/stories` | Get stories for loop steps |

### Pipeline API (port 3333)

| Endpoint | Description |
|----------|-------------|
| `GET /api/pipeline/status` | Collector health and metrics |
| `GET /api/pipeline/blocks?limit=50` | Recent block metrics |
| `GET /api/pipeline/prices?token=&chain=&limit=100` | Price snapshots |
| `GET /api/pipeline/balances?address=&limit=50` | Balance snapshots |
| `GET /api/pipeline/contracts?address=&method=&limit=50` | Contract events |
| `GET /api/pipeline/stream` | SSE real-time event stream |

---

## Differentiators

| Feature | AgentHub | Eliza | GOAT | Olas |
|---------|----------|-------|------|------|
| Multi-agent orchestration | Native YAML pipelines | Manual coordination | None | Native |
| Monad integration | First-class (viem) | Plugin-based | Plugin-based | None |
| Transaction security | Multi-sig + spending caps + simulation | Plaintext keys | Basic signing | Basic |
| Parallel execution | Promise.all() + local nonce tracking | Sequential | Sequential | Sequential |
| Real-time pipeline | SSE + 5 collectors + circuit breakers | None | None | Basic |
| Observable dashboard | Live block ticker, traces, health bars | Basic logs | None | Web UI |
| Production-ready | Guardrails + retry + escalation | Demo-focused | Beta | Yes |

---

## Requirements

- **Node.js >= 22** (required for native `node:sqlite`)
- **npm** (included with Node.js)
- **Monad testnet access** (public RPC: `https://testnet.monad.xyz/v1`)

---

## License

MIT

---

**Built for Monad** | Applying to Nitro Accelerator | Part of the Monad AI Blueprint program
