import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { CacheManager, getGlobalCache } from '../cache.js';

describe('CacheManager', () => {
  let cache: CacheManager;

  before(() => {
    cache = new CacheManager(1000); // 1 second TTL for tests
  });

  after(() => {
    cache.destroy();
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    assert.equal(cache.get('key1'), 'value1');
  });

  it('should return null for expired entries', async () => {
    cache.set('key2', 'value2', 100); // 100ms TTL
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(cache.get('key2'), null);
  });

  it('should support custom TTL', () => {
    cache.set('key3', 'value3', 5000);
    assert.equal(cache.get('key3'), 'value3');
  });

  it('should delete entries', () => {
    cache.set('key4', 'value4');
    cache.delete('key4');
    assert.equal(cache.get('key4'), null);
  });

  it('should clear all entries', () => {
    cache.set('key5', 'value5');
    cache.set('key6', 'value6');
    cache.clear();
    assert.equal(cache.get('key5'), null);
    assert.equal(cache.get('key6'), null);
  });

  it('should return cache stats', () => {
    cache.clear();
    cache.set('key7', 'value7');
    const stats = cache.getStats();
    assert.equal(stats.size, 1);
    assert.deepEqual(stats.keys, ['key7']);
  });

  it('should cleanup expired entries', async () => {
    cache.clear();
    cache.set('key8', 'value8', 100);
    await new Promise(resolve => setTimeout(resolve, 150));
    cache['cleanup'](); // Call private method
    const stats = cache.getStats();
    assert.equal(stats.size, 0);
  });
});

describe('getGlobalCache', () => {
  it('should return singleton instance', () => {
    const cache1 = getGlobalCache();
    const cache2 = getGlobalCache();
    assert.strictEqual(cache1, cache2);
  });
});
