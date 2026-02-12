# Token Monitor Workflow

Monitors token prices, wallet balances, and contract state on Monad.

## Features

- **Wallet Balance Checking**: Query wallet balances using Monad RPC
- **Token Price Feed**: Fetch token prices from DexScreener API
- **Contract Reading**: Read token contract state (totalSupply, etc.)
- **Automated Reporting**: Generate monitoring reports

## Usage

```bash
agenthub workflow run token-monitor "Monitor USDC token"
```

## Configuration

Edit `workflow.yml` to customize:
- `token_address`: The token contract address to monitor
- `chain_id`: The chain to monitor (monad, ethereum, etc.)
- `wallet_address`: The wallet to check balance for

## Steps

1. **check_balance**: Queries wallet balance via `wallet_balance` tool
2. **fetch_price**: Fetches token price via `token_price` tool
3. **check_supply**: Reads contract totalSupply via `contract_read` tool
4. **report**: Generates summary report

## Example Output

```
Balance: 1.5 MON
Price: $0.99 USD (24h volume: $1.2M)
Supply: 1000000000 tokens
```
