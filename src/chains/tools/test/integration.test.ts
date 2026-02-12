import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invokeChainTool } from '../index.js';

describe('Chain Tools Integration', () => {
  it('should route to wallet_balance tool', async () => {
    // Note: This would require live RPC or mocking
    // Testing only the routing logic here
    const result = await invokeChainTool({
      tool: 'wallet_balance',
      args: { addresses: [] }, // Invalid args to trigger early return
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.message.includes('At least one address'));
  });

  it('should route to token_price tool', async () => {
    // Note: This would require live API or mocking
    // Testing only the routing logic here
    const result = await invokeChainTool({
      tool: 'token_price',
      args: { tokens: [] }, // Invalid args to trigger early return
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.message.includes('At least one token'));
  });

  it('should route to contract_read tool', async () => {
    // Note: This would require live RPC or mocking
    // Testing only the routing logic here
    const result = await invokeChainTool({
      tool: 'contract_read',
      args: {}, // Missing contractAddress
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.message.includes('Contract address'));
  });

  it('should handle unknown tool', async () => {
    const result = await invokeChainTool({
      tool: 'unknown_tool' as any,
      args: {},
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.message.includes('Unknown tool'));
    assert.equal(result.error?.code, 'UNKNOWN_TOOL');
  });

  it('should return timestamp in results', async () => {
    const result = await invokeChainTool({
      tool: 'wallet_balance',
      args: { addresses: [] },
    });

    assert.ok(result.timestamp);
    assert.ok(typeof result.timestamp === 'string');
    // Verify it's a valid ISO timestamp
    const date = new Date(result.timestamp);
    assert.ok(!isNaN(date.getTime()));
  });

  it('should handle errors gracefully', async () => {
    const result = await invokeChainTool({
      tool: 'contract_read',
      args: null, // Intentionally invalid
    });

    assert.equal(result.ok, false);
    assert.ok(result.error);
    assert.ok(result.timestamp);
  });
});
