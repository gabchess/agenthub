import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBalanceOutput } from '../wallet-balance.js';

describe('wallet-balance tool', () => {
  describe('parseBalanceOutput', () => {
    it('should extract addresses from output', () => {
      const output = `
        Check these wallets:
        ADDRESS: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
        BALANCE: 0x1111111111111111111111111111111111111111
        STATUS: done
      `;

      const addresses = parseBalanceOutput(output);
      assert.equal(addresses.length, 2);
      assert.ok(addresses[0].startsWith('0x'));
    });

    it('should return empty array for no addresses', () => {
      const addresses = parseBalanceOutput('No addresses here');
      assert.deepEqual(addresses, []);
    });

    it('should handle mixed case addresses', () => {
      const output = 'ADDRESS: 0xABCD1234abcd1234ABCD1234abcd1234ABCD1234';
      const addresses = parseBalanceOutput(output);
      assert.equal(addresses.length, 1);
    });

    it('should deduplicate addresses', () => {
      const output = `
        ADDRESS: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
        BALANCE: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
      `;
      const addresses = parseBalanceOutput(output);
      assert.equal(addresses.length, 1);
    });

    it('should extract multiple unique addresses', () => {
      const output = `
        ADDRESS: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
        ADDRESS: 0x1111111111111111111111111111111111111111
        ADDRESS: 0x2222222222222222222222222222222222222222
      `;
      const addresses = parseBalanceOutput(output);
      assert.equal(addresses.length, 3);
    });
  });

  // Note: Full integration tests would require mocking MonadClient
  // which is complex due to viem dependencies. These are covered in
  // integration tests instead.
});
