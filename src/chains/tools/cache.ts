/**
 * Cache entry with expiration time.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache manager for storing temporary data with TTL (time-to-live).
 * Automatically cleans up expired entries periodically.
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private cleanupInterval: NodeJS.Timeout | null;
  private defaultTtlMs: number;

  /**
   * Creates a new CacheManager instance.
   * @param defaultTtlMs - Default time-to-live in milliseconds (default: 60000ms / 1 minute)
   */
  constructor(defaultTtlMs: number = 60000) {
    this.cache = new Map();
    this.cleanupInterval = null;
    this.defaultTtlMs = defaultTtlMs;

    // Start cleanup interval every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000);
  }

  /**
   * Retrieves a value from the cache.
   * @param key - The cache key
   * @returns The cached value if it exists and hasn't expired, null otherwise
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores a value in the cache with an expiration time.
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlMs - Time-to-live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  /**
   * Removes a specific entry from the cache.
   * @param key - The cache key to remove
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Removes expired entries from the cache.
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stops the cleanup interval and clears the cache.
   * Should be called when the cache manager is no longer needed.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Returns statistics about the cache.
   * @returns An object containing the cache size and all keys
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Global cache manager singleton instance.
 */
let globalCache: CacheManager | null = null;

/**
 * Gets or creates the global cache manager singleton.
 * @returns The global CacheManager instance
 */
export function getGlobalCache(): CacheManager {
  if (!globalCache) {
    globalCache = new CacheManager();
  }
  return globalCache;
}
