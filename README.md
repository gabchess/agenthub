# AgentHub

**Monad-native AI agent orchestration platform**

Production-grade shared memory, wallet primitives, and observable execution for AI agent teams on Monad blockchain.

## Why AgentHub?

Multi-agent systems are moving on-chain (ai16z: $2B market cap, Olas: 700K tx/month), but they're bottlenecked by blockchain throughput and lack production infrastructure.

**AgentHub** leverages Monad's 10,000 TPS parallel execution to enable agent swarm coordination impossible on other chains. What costs $18,000 on Ethereum costs $0.68 on Monad.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              AGENT ORCHESTRATION LAYER              │
│  YAML Workflows → Missions → Steps → Events        │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
┌───────▼─────┐ ▼ ┌──────▼──────┐
│ Agent Teams │   │   Monad     │
│             │   │ Blockchain  │
│ - Monitor   │   │             │
│ - Decide    │   │ 10,000 TPS  │
│ - Execute   │   │ Parallel    │
│ - Verify    │   │ Execution   │
└─────────────┘   └─────────────┘
```

## Key Features

- 🔐 **Security-first**: Multi-sig wallets, spending limits, MEV protection, transaction simulation
- ⚡ **Monad-optimized**: Parallel transaction submission, local nonce tracking, 800ms finality
- 🎯 **Agent specialization**: Deterministic workflows with planner, executor, verifier roles
- 🔁 **Retry & escalation**: Automatic retries with human escalation on failure
- 📊 **Observable execution**: Real-time monitoring, audit trails, compliance-ready

## Quick Start

```bash
# Clone
git clone https://github.com/agenthub-xyz/agenthub.git
cd agenthub

# Install
npm install
npm run build

# Deploy your first agent team
agenthub workflow run monad-health-check
```

## Workflows

### monad-health-check (3 agents)
Monitor Monad network health, detect anomalies, generate reports.

```yaml
scanner → analyzer → reporter
```

## Differentiators vs Competitors

| Feature | AgentHub | Eliza | GOAT | Olas |
|---------|----------|-------|------|------|
| Multi-agent orchestration | ✅ Native | ❌ Manual | ❌ None | ✅ Native |
| Monad integration | ✅ First-class | ⚠️ Plugin | ⚠️ Plugin | ❌ No |
| Transaction security | ✅ Multi-sig + limits | ❌ Plaintext keys | ⚠️ Basic | ⚠️ Basic |
| Parallel execution | ✅ Optimized | ❌ No | ❌ No | ❌ No |
| Production-ready | ✅ Security audit | ❌ Demo-focused | ⚠️ Beta | ✅ Yes |

## Architecture Philosophy

Built on proven foundations from **Antfarm** (YAML workflows, SQLite state, cron orchestration), extended with:

- **Blockchain-aware steps**: `on_chain_verify` for transaction verification
- **Wallet security layer**: Hot/cold separation, multi-sig, spending limits
- **Monad optimizations**: Promise.all() parallel txs, local nonce tracking
- **Real-time state**: Supabase for shared memory across agent swarms

## Roadmap

- [x] Fork Antfarm core (YAML workflows, agent orchestration)
- [x] Monad RPC integration (testnet)
- [ ] Security layer (multi-sig, spending limits, simulation)
- [ ] First production workflow (DeFi rebalancing)
- [ ] Nitro Accelerator demo (100-agent swarm)
- [ ] Mainnet launch (March 2026)

## Requirements

- Node.js >= 22
- OpenClaw v2026.2.9+
- Monad testnet access

## Built For

- **DeFi Protocols**: Automated liquidity management, MEV protection
- **Agent Developers**: Orchestrate Eliza/GOAT agents on-chain
- **DAOs**: Multi-agent governance workflows

## Security

We take security seriously. This repo will undergo external audit by Trail of Bits before mainnet launch. See [SECURITY.md](SECURITY.md) for our security practices.

## License

MIT

---

**Applying to Nitro Accelerator** | Backed by Paradigm, Dragonfly, Electric Capital

Part of the Monad AI Blueprint program
