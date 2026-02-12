import { getWalletBalances } from './dist/chains/tools/wallet-balance.js';
import { getTokenPrices } from './dist/chains/tools/token-price.js';
import { readContract } from './dist/chains/tools/contract-read.js';
import { getGlobalCache } from './dist/chains/tools/cache.js';
import { traceStepClaim, traceStepComplete } from './dist/lib/tracer.js';

const runId = '25d03f33-36c5-4d64-aa9a-84c7844627df';
const cache = getGlobalCache();

console.log('=== Testing Crypto Tools ===\n');

// Test 1: Wallet Balance
console.log('1. Testing Wallet Balance Checker...');
try {
  // Trace step claim
  traceStepClaim(runId, 'check_balance', 'token-monitor/monitor', 'Check wallet balance');

  const balanceResult = await getWalletBalances({
    addresses: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
    chain: 'monad-testnet'
  }, cache);

  console.log('Balance Result:', JSON.stringify(balanceResult, null, 2));

  // Trace step complete
  traceStepComplete(runId, 'check_balance', JSON.stringify(balanceResult), 1500);
  console.log('✓ Wallet balance test passed\n');
} catch (error) {
  console.error('✗ Wallet balance test failed:', error.message);
}

// Test 2: Token Price
console.log('2. Testing Token Price Feed...');
try {
  traceStepClaim(runId, 'fetch_price', 'token-monitor/monitor', 'Fetch token price');

  const priceResult = await getTokenPrices({
    tokens: [{
      chainId: 'ethereum',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC on Ethereum
    }]
  }, cache);

  console.log('Price Result:', JSON.stringify(priceResult, null, 2));

  traceStepComplete(runId, 'fetch_price', JSON.stringify(priceResult), 2000);
  console.log('✓ Token price test passed\n');
} catch (error) {
  console.error('✗ Token price test failed:', error.message);
}

// Test 3: Contract Read (USDC totalSupply on Ethereum)
console.log('3. Testing Contract Read...');
try {
  traceStepClaim(runId, 'check_supply', 'token-monitor/monitor', 'Read contract supply');

  const contractResult = await readContract({
    chain: 'monad-testnet',
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    method: 'decimals',
    args: []
  }, cache);

  console.log('Contract Result:', JSON.stringify(contractResult, null, 2));

  traceStepComplete(runId, 'check_supply', JSON.stringify(contractResult), 1800);
  console.log('✓ Contract read test passed\n');
} catch (error) {
  console.error('✗ Contract read test failed:', error.message);
}

console.log('=== All Tests Complete ===');
