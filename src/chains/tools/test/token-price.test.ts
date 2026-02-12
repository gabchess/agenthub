import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTokenQuery } from '../token-price.js';

describe('token-price tool', () => {
  describe('parseTokenQuery', () => {
    it('should extract tokens from output', () => {
      const output = `
        /TOKEN: ethereum:0x1234567890123456789012345678901234567890
        /TOKEN: monad 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
        STATUS: done
      `;

      const tokens = parseTokenQuery(output);
      assert.equal(tokens.length, 2);
      assert.equal(tokens[0].chainId, 'ethereum');
      assert.equal(tokens[1].chainId, 'monad');
    });

    it('should return empty array for no tokens', () => {
      const tokens = parseTokenQuery('No tokens here');
      assert.deepEqual(tokens, []);
    });

    it('should handle various formats', () => {
      const output = '/TOKEN: BASE:0x1234567890123456789012345678901234567890';
      const tokens = parseTokenQuery(output);
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].chainId, 'base');
    });

    it('should handle TOKEN prefix with slash', () => {
      const output = '/TOKEN: ethereum:0x1234567890123456789012345678901234567890';
      const tokens = parseTokenQuery(output);
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].chainId, 'ethereum');
      assert.equal(tokens[0].address, '0x1234567890123456789012345678901234567890');
    });

    it('should handle multiple tokens on different chains', () => {
      const output = `
        Checking prices for:
        /TOKEN: ethereum:0x1234567890123456789012345678901234567890
        /TOKEN: base:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
        /TOKEN: arbitrum:0x9999999999999999999999999999999999999999
      `;
      const tokens = parseTokenQuery(output);
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].chainId, 'ethereum');
      assert.equal(tokens[1].chainId, 'base');
      assert.equal(tokens[2].chainId, 'arbitrum');
    });

    it('should normalize chain IDs to lowercase', () => {
      const output = '/TOKEN: ETHEREUM:0x1234567890123456789012345678901234567890';
      const tokens = parseTokenQuery(output);
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].chainId, 'ethereum');
    });

    it('should handle space separator instead of colon', () => {
      const output = '/TOKEN: monad 0x1234567890123456789012345678901234567890';
      const tokens = parseTokenQuery(output);
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].chainId, 'monad');
      assert.equal(tokens[0].address, '0x1234567890123456789012345678901234567890');
    });
  });
});
