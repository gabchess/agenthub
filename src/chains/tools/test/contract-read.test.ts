import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseContractReadQuery } from '../contract-read.js';

describe('contract-read tool', () => {
  describe('parseContractReadQuery', () => {
    it('should extract contract parameters', () => {
      const output = `
        CONTRACT: 0x1234567890123456789012345678901234567890
        METHOD: balanceOf
        ARGS: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"]
        STATUS: done
      `;

      const params = parseContractReadQuery(output);
      assert.equal(params.contractAddress, '0x1234567890123456789012345678901234567890');
      assert.equal(params.method, 'balanceOf');
      assert.ok(Array.isArray(params.args));
      assert.equal(params.args![0], '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should handle missing fields gracefully', () => {
      const output = 'CONTRACT: 0x1234567890123456789012345678901234567890';
      const params = parseContractReadQuery(output);
      assert.equal(params.contractAddress, '0x1234567890123456789012345678901234567890');
      assert.equal(params.method, undefined);
      assert.equal(params.args, undefined);
    });

    it('should handle invalid JSON args', () => {
      const output = `
        CONTRACT: 0x1234567890123456789012345678901234567890
        ARGS: [invalid json]
      `;
      const params = parseContractReadQuery(output);
      assert.equal(params.args, undefined);
    });

    it('should extract method without args', () => {
      const output = `
        CONTRACT: 0x1234567890123456789012345678901234567890
        METHOD: totalSupply
      `;
      const params = parseContractReadQuery(output);
      assert.equal(params.contractAddress, '0x1234567890123456789012345678901234567890');
      assert.equal(params.method, 'totalSupply');
      assert.equal(params.args, undefined);
    });

    it('should handle complex args array', () => {
      const output = `
        CONTRACT: 0x1234567890123456789012345678901234567890
        METHOD: transfer
        ARGS: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "1000000000000000000"]
      `;
      const params = parseContractReadQuery(output);
      assert.equal(params.method, 'transfer');
      assert.ok(Array.isArray(params.args));
      assert.equal(params.args!.length, 2);
      assert.equal(params.args![0], '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      assert.equal(params.args![1], '1000000000000000000');
    });

    it('should handle multiline args', () => {
      const output = `
        CONTRACT: 0x1234567890123456789012345678901234567890
        METHOD: complexMethod
        ARGS: [
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          123,
          true
        ]
      `;
      const params = parseContractReadQuery(output);
      assert.equal(params.method, 'complexMethod');
      assert.ok(Array.isArray(params.args));
      assert.equal(params.args!.length, 3);
      assert.equal(params.args![1], 123);
      assert.equal(params.args![2], true);
    });

    it('should handle lowercase hex addresses', () => {
      const output = 'CONTRACT: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const params = parseContractReadQuery(output);
      assert.equal(params.contractAddress, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should handle mixed case hex addresses', () => {
      const output = 'CONTRACT: 0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const params = parseContractReadQuery(output);
      assert.equal(params.contractAddress, '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12');
    });
  });
});
