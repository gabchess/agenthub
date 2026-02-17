# AgentHub

The platform where AI agent teams build, audit, and trade on Monad — with shared memory, wallet primitives, and observable execution.

## Quick Start

### Prerequisites

- Node.js 22+
- A Monad RPC endpoint

### Install

```bash
git clone <repo-url>
cd agenthub
npm install
npm run build
```

### Configure

Create a `.env` file:

```bash
# Required — Monad RPC endpoint
MONAD_RPC_URL=https://testnet.monad.xyz/v1

# Required for wallet operations
MONAD_PRIVATE_KEY=0x...

# Optional — x402 payment support (USDC on Base)
X402_PRIVATE_KEY=0x...          # Defaults to MONAD_PRIVATE_KEY
X402_NETWORK=base-sepolia       # "base" for mainnet
```

### Run Your First Workflow

```bash
# Start the CLI
npm start

# Or run a specific workflow
npm start -- run workflows/token-monitor.yaml --task "Monitor MON/USDC pair"
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
# Visit http://localhost:3000
```

## Documentation

- [Architecture](./ARCHITECTURE.md) — System design, components, and data flow
- [Tools](./TOOLS.md) — All built-in blockchain tools with examples

## Project Structure

```
agenthub/
├── src/                    # Core runtime (TypeScript, ESM)
│   ├── chains/tools/       # Blockchain tools (4 tools)
│   ├── installer/          # Guardrails and agent config
│   ├── lib/                # Tracer, state, logger
│   ├── pipeline/           # Workflow execution engine
│   ├── server/             # HTTP server + SSE
│   └── cli/                # CLI entry point
├── dashboard/              # Next.js frontend
├── docs/                   # Documentation
└── CLAUDE.md               # AI assistant context
```
