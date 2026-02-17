import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseX402PayOutput, x402Pay } from '../x402-pay.js';

describe('x402-pay tool', () => {
  describe('parseX402PayOutput', () => {
    it('should extract URL from X402_FETCH output', () => {
      const output = 'X402_FETCH: https://api.example.com/data';
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 1);
      assert.equal(results[0].url, 'https://api.example.com/data');
      assert.equal(results[0].maxPaymentUsd, undefined);
    });

    it('should extract URL and MAX amount', () => {
      const output = 'X402_FETCH: https://api.example.com/data MAX: 0.05';
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 1);
      assert.equal(results[0].url, 'https://api.example.com/data');
      assert.equal(results[0].maxPaymentUsd, '0.05');
    });

    it('should handle PAY_FETCH prefix', () => {
      const output = 'PAY_FETCH: https://paid-api.io/v1/query MAX: 1.00';
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 1);
      assert.equal(results[0].url, 'https://paid-api.io/v1/query');
      assert.equal(results[0].maxPaymentUsd, '1.00');
    });

    it('should be case-insensitive', () => {
      const output = 'x402_fetch: https://api.example.com/data max: 0.10';
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 1);
      assert.equal(results[0].url, 'https://api.example.com/data');
      assert.equal(results[0].maxPaymentUsd, '0.10');
    });

    it('should extract multiple matches', () => {
      const output = `
        First: X402_FETCH: https://api1.example.com/a MAX: 0.01
        Second: PAY_FETCH: https://api2.example.com/b MAX: 0.05
        Third: X402_FETCH: https://api3.example.com/c
      `;
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 3);
      assert.equal(results[0].url, 'https://api1.example.com/a');
      assert.equal(results[0].maxPaymentUsd, '0.01');
      assert.equal(results[1].url, 'https://api2.example.com/b');
      assert.equal(results[1].maxPaymentUsd, '0.05');
      assert.equal(results[2].url, 'https://api3.example.com/c');
      assert.equal(results[2].maxPaymentUsd, undefined);
    });

    it('should return empty array for no matches', () => {
      const output = 'No payment URLs here, just regular text.';
      const results = parseX402PayOutput(output);
      assert.deepEqual(results, []);
    });

    it('should handle integer MAX amounts', () => {
      const output = 'X402_FETCH: https://api.example.com/data MAX: 5';
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 1);
      assert.equal(results[0].maxPaymentUsd, '5');
    });

    it('should handle http URLs', () => {
      const output = 'X402_FETCH: http://localhost:3000/api/test';
      const results = parseX402PayOutput(output);
      assert.equal(results.length, 1);
      assert.equal(results[0].url, 'http://localhost:3000/api/test');
    });
  });

  describe('x402Pay validation', () => {
    it('should return INVALID_INPUT when URL is missing', async () => {
      const result = await x402Pay({} as any);
      assert.equal(result.ok, false);
      assert.equal(result.error?.code, 'INVALID_INPUT');
    });

    it('should return INVALID_INPUT when URL is empty string', async () => {
      const result = await x402Pay({ url: '' });
      assert.equal(result.ok, false);
      assert.equal(result.error?.code, 'INVALID_INPUT');
    });

    // Save and restore env vars around wallet tests
    let savedX402Key: string | undefined;
    let savedMonadKey: string | undefined;

    beforeEach(() => {
      savedX402Key = process.env.X402_PRIVATE_KEY;
      savedMonadKey = process.env.MONAD_PRIVATE_KEY;
      delete process.env.X402_PRIVATE_KEY;
      delete process.env.MONAD_PRIVATE_KEY;
    });

    afterEach(() => {
      if (savedX402Key !== undefined) {
        process.env.X402_PRIVATE_KEY = savedX402Key;
      } else {
        delete process.env.X402_PRIVATE_KEY;
      }
      if (savedMonadKey !== undefined) {
        process.env.MONAD_PRIVATE_KEY = savedMonadKey;
      } else {
        delete process.env.MONAD_PRIVATE_KEY;
      }
    });

    it('should return NO_WALLET when no private key is set', async () => {
      const result = await x402Pay({ url: 'https://api.example.com/data' });
      assert.equal(result.ok, false);
      assert.equal(result.error?.code, 'NO_WALLET');
    });
  });
});
