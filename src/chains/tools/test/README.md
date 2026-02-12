# Crypto Tools Test Suite

This directory contains comprehensive tests for all crypto tools in the AgentHub platform.

## Test Files

### 1. cache.test.ts
Tests the CacheManager functionality including:
- Store and retrieve values
- TTL expiration
- Custom TTL support
- Entry deletion
- Cache clearing
- Statistics retrieval
- Automatic cleanup of expired entries
- Global cache singleton pattern

**Tests: 9 | Pass: 9 | Fail: 0**

### 2. wallet-balance.test.ts
Tests the wallet balance tool, specifically the `parseBalanceOutput` function:
- Extract addresses from agent output
- Handle empty input
- Support mixed case addresses
- Deduplicate addresses
- Extract multiple unique addresses

**Tests: 5 | Pass: 5 | Fail: 0**

### 3. token-price.test.ts
Tests the token price feed tool, specifically the `parseTokenQuery` function:
- Extract tokens from output
- Handle empty input
- Support various format patterns
- Handle TOKEN prefix with slash
- Support multiple tokens on different chains
- Normalize chain IDs to lowercase
- Handle space separator instead of colon

**Tests: 7 | Pass: 7 | Fail: 0**

### 4. contract-read.test.ts
Tests the contract read tool, specifically the `parseContractReadQuery` function:
- Extract contract parameters (address, method, args)
- Handle missing fields gracefully
- Handle invalid JSON args
- Extract method without args
- Parse complex args arrays
- Support multiline args
- Handle lowercase and mixed case hex addresses

**Tests: 8 | Pass: 8 | Fail: 0**

### 5. integration.test.ts
Integration tests for the tool registry and routing:
- Route to wallet_balance tool
- Route to token_price tool
- Route to contract_read tool
- Handle unknown tools
- Return timestamps in results
- Handle errors gracefully

**Tests: 6 | Pass: 6 | Fail: 0**

## Running Tests

### Build First
```bash
npm run build
```

### Run All Tests
```bash
node --test dist/chains/tools/test/*.test.js
```

### Run Individual Test Files
```bash
node --test dist/chains/tools/test/cache.test.js
node --test dist/chains/tools/test/wallet-balance.test.js
node --test dist/chains/tools/test/token-price.test.js
node --test dist/chains/tools/test/contract-read.test.js
node --test dist/chains/tools/test/integration.test.js
```

## Test Coverage

**Total Tests: 35**
**Total Pass: 35**
**Total Fail: 0**
**Success Rate: 100%**

## Notes

- Parser function tests (parseBalanceOutput, parseTokenQuery, parseContractReadQuery) don't require external dependencies and can run without RPC access
- Full integration tests with live RPC/API calls are intentionally skipped as they require:
  - Live Monad RPC endpoint
  - Valid API keys for DexScreener
  - Network connectivity
- Tests use Node.js built-in test runner (node:test)
- All tests use strict assertions from node:assert/strict
- Cache tests include async operations to verify TTL expiration

## Future Improvements

- Add mock RPC server for full end-to-end testing
- Add tests for error handling in live API calls
- Add performance benchmarks for caching behavior
- Add tests for concurrent cache access patterns
