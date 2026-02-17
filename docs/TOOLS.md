# AgentHub Tools

AgentHub provides 4 built-in blockchain tools that agents can invoke during workflow execution. All tools return a standardized `ToolResult<T>` format.

## Tool Result Format

```typescript
interface ToolResult<T> {
  ok: boolean;           // Whether the operation succeeded
  result?: T;            // Data if successful
  error?: {
    code: string;        // Programmatic error code
    message: string;     // Human-readable message
    details?: any;       // Additional context
  };
  cached?: boolean;      // Whether result came from cache
  timestamp: string;     // ISO timestamp
}
```

---

## `wallet_balance`

Check native token (MON) balances for one or more wallet addresses on Monad.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addresses` | `Address[]` | Yes | Wallet addresses to check |
| `chain` | `string` | No | `monad-testnet` (default) or `monad-mainnet` |

### Result Type

```typescript
interface WalletBalanceResult {
  balances: Array<{
    address: string;
    balance: string;        // e.g. "1.5 MON"
    balanceWei: string;     // Raw wei value
    blockNumber: string;
  }>;
}
```

### Example

```typescript
const result = await invokeChainTool({
  tool: 'wallet_balance',
  args: {
    addresses: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'],
    chain: 'monad-testnet',
  },
});
// result.result.balances[0].balance → "4.50 MON"
```

---

## `token_price`

Fetch real-time token prices from DEX subgraphs and CoinGecko.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokens` | `Array<{chainId, address}>` | Yes | Tokens to price |
| `includeHistory` | `boolean` | No | Include price history |
| `historyHours` | `number` | No | Hours of history (default: 24) |

### Result Type

```typescript
interface TokenPriceResult {
  prices: Array<{
    chainId: string;
    address: string;
    priceUsd: string;
    priceNative: string;
    volume24h: string;
    liquidity: string;
    priceChange24h: string;
    lastUpdated: string;
    history?: Array<{ timestamp: string; priceUsd: string }>;
  }>;
}
```

### Example

```typescript
const result = await invokeChainTool({
  tool: 'token_price',
  args: {
    tokens: [{ chainId: 'monad', address: '0x4200...' }],
  },
});
// result.result.prices[0].priceUsd → "4.12"
```

---

## `contract_read`

Read data from smart contracts on Monad using ABI-encoded calls.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contractAddress` | `Address` | Yes | Contract to read from |
| `chain` | `string` | No | `monad-testnet` (default) or `monad-mainnet` |
| `abi` | `any[]` | No | Contract ABI (for decoded results) |
| `method` | `string` | No | Method name to call |
| `args` | `any[]` | No | Method arguments |
| `data` | `0x${string}` | No | Raw calldata (alternative to abi+method) |

### Result Type

```typescript
interface ContractReadResult {
  value: any;              // Decoded return value
  decoded?: any;           // ABI-decoded result
  blockNumber: string;
  raw: `0x${string}`;     // Raw return data
}
```

### Example

```typescript
const result = await invokeChainTool({
  tool: 'contract_read',
  args: {
    contractAddress: '0x4200000000000000000000000000000000000001',
    abi: ERC20_ABI,
    method: 'balanceOf',
    args: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'],
  },
});
// result.result.value → 4500000000000000000n
```

---

## `x402_pay`

Make HTTP requests to x402-enabled APIs with automatic USDC micropayments on Base.

### How x402 Works

[x402](https://www.x402.org/) is an open protocol that uses HTTP 402 (Payment Required) to enable machine-to-machine payments:

1. Client sends a request to an API endpoint
2. Server responds with HTTP 402 + payment requirements in headers
3. Client signs a USDC payment (EIP-3009 transfer) and retries
4. Server verifies payment via a facilitator and returns the response

AgentHub integrates x402 via the `x402-fetch` library, which wraps native `fetch` to handle the payment flow automatically.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `X402_PRIVATE_KEY` | Yes* | — | Private key for Base wallet (0x-prefixed) |
| `X402_NETWORK` | No | `base-sepolia` | `base` for mainnet, `base-sepolia` for testnet |

*Falls back to `MONAD_PRIVATE_KEY` if not set.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `string` | Yes | Target URL (may return 402) |
| `method` | `string` | No | `GET` (default), `POST`, or `PUT` |
| `headers` | `Record<string, string>` | No | Request headers |
| `body` | `string` | No | Request body |
| `maxPaymentUsd` | `string` | No | Max USDC willing to pay (e.g. `"0.01"`) |
| `agentId` | `string` | No | Agent ID for guardrail checks |
| `runId` | `string` | No | Run ID for spending tracking |

### Result Type

```typescript
interface X402PayResult {
  status: number;                    // HTTP status of final response
  body: string;                      // Response body
  headers: Record<string, string>;   // Response headers
  paymentMade: boolean;              // Whether a 402 payment occurred
  payment?: {                        // Present only if paymentMade=true
    amountUsd: string;               // Amount paid in USDC
    payTo: string;                   // Recipient address
    network: string;                 // "base" or "base-sepolia"
    asset: string;                   // "USDC"
  };
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | URL is missing |
| `NO_WALLET` | No private key configured |
| `PAYMENT_TOO_EXPENSIVE` | Amount exceeds `maxPaymentUsd` |
| `SPENDING_LIMIT_EXCEEDED` | Guardrail spending limit hit |
| `X402_PAYMENT_FAILED` | Payment or network error |

### Example

```typescript
const result = await invokeChainTool({
  tool: 'x402_pay',
  args: {
    url: 'https://api.marketdata.io/v1/monad/prices',
    maxPaymentUsd: '0.05',
    agentId: 'agenthub/scout',
    runId: 'run-123',
  },
});

if (result.ok && result.result.paymentMade) {
  console.log(`Paid $${result.result.payment.amountUsd} USDC`);
  console.log(`Response: ${result.result.body}`);
}
```

### Workflow YAML Example

```yaml
agents:
  - id: agenthub/scout
    role: scanning
    model: claude-sonnet-4-5-20250929
    thinking: medium

steps:
  - id: fetch-premium-data
    agent: agenthub/scout
    input: |
      Fetch premium market data from the paid API.
      X402_FETCH: https://api.marketdata.io/v1/monad/prices MAX: 0.05
    expects: "TOKENS_FOUND: <count>"

guardrails:
  agenthub/scout:
    tool_allowlist: [x402_pay, wallet_balance, token_price]
    max_spend_per_tx: 0.10
    max_spend_per_run: 1.00
```

### Agent Output Parsing

The `parseX402PayOutput` function extracts x402 payment requests from agent text output:

```typescript
import { parseX402PayOutput } from './chains/tools';

const params = parseX402PayOutput(
  'X402_FETCH: https://api.example.com/data MAX: 0.05'
);
// [{ url: 'https://api.example.com/data', maxPaymentUsd: '0.05' }]
```

Supported patterns:
- `X402_FETCH: <url>` — basic request
- `X402_FETCH: <url> MAX: <amount>` — request with spending cap
- `PAY_FETCH: <url>` — alternative prefix
