/**
 * Advanced Caching Strategies for Edge Computing
 * @module edge-utils/cache/strategies
 */

const crypto = require('crypto');

/**
 * Cache-aside pattern implementation
 * Checks cache first, then fetches from source if miss
 */
class CacheAsidePattern {
  constructor(cache, fetcher, options = {}) {
    this.cache = cache;
    this.fetcher = fetcher;
    this.options = options;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.tags = new Map(); // key -> Set of tags
  }

  async get(key, options = {}) {
    try {
      // Check cache first
      const cached = await this.cache.get(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }

      // Cache miss - fetch from source
      const value = await this.fetcher(key);

      // Store in cache with TTL
      await this.cache.set(key, value, { ttl: options.ttl || this.ttl });

      // Store tags if provided
      if (options.tags) {
        this._storeTags(key, options.tags);
      }

      return value;
    } catch (error) {
      // Log error silently or use provided error handler
      if (this.options.onError && typeof this.options.onError === 'function') {
        this.options.onError(`Cache-aside error for key ${key}`, error);
      }
      // On error, try to fetch directly without caching
      return await this.fetcher(key);
    }
  }

  async invalidateByTags(tags) {
    const keysToInvalidate = new Set();

    for (const tag of tags) {
      const taggedKeys = this.tags.get(tag) || new Set();
      taggedKeys.forEach(key => keysToInvalidate.add(key));
    }

    const promises = Array.from(keysToInvalidate).map(async (key) => {
      try {
        await this.cache.delete(key);
      } catch (error) {
        // Ignore deletion errors
      }
    });

    await Promise.all(promises);

    // Clean up tag references
    for (const tag of tags) {
      this.tags.delete(tag);
    }
  }

  _storeTags(key, tags) {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    }
  }
}

/**
 * Write-through cache pattern
 * Writes to both cache and source simultaneously
 */
class WriteThroughPattern {
  constructor(cache, writer, options = {}) {
    this.cache = cache;
    this.writer = writer;
    this.options = options;
    this.ttl = options.ttl || 300000;
  }

  async set(key, value, options = {}) {
    try {
      // Write to source first
      await this.writer(key, value);

      // Then update cache
      await this.cache.set(key, value, { ttl: options.ttl || this.ttl });

      return true;
    } catch (error) {
      // Log error silently or use provided error handler
      if (this.options.onError && typeof this.options.onError === 'function') {
        this.options.onError(`Write-through error for key ${key}`, error);
      }
      throw error;
    }
  }

  async get(key) {
    return await this.cache.get(key);
  }
}

/**
 * Write-behind cache pattern
 * Writes to cache immediately, defers source writes
 */
class WriteBehindPattern {
  constructor(cache, writer, options = {}) {
    this.cache = cache;
    this.writer = writer;
    this.options = options;
    this.ttl = options.ttl || 300000;
    this.flushInterval = options.flushInterval || 30000; // 30 seconds
    this.pendingWrites = new Map();
    this.isFlushing = false;

    // Start periodic flush
    this.flushTimer = setInterval(() => this._flush(), this.flushInterval);
  }

  async set(key, value, options = {}) {
    // Write to cache immediately
    await this.cache.set(key, value, { ttl: options.ttl || this.ttl });

    // Queue write to source
    this.pendingWrites.set(key, { value, timestamp: Date.now() });

    return true;
  }

  async get(key) {
    return await this.cache.get(key);
  }

  async _flush() {
    if (this.isFlushing || this.pendingWrites.size === 0) return;

    this.isFlushing = true;
    const writes = Array.from(this.pendingWrites.entries());
    this.pendingWrites.clear();

    try {
      const promises = writes.map(async ([key, { value }]) => {
        try {
          await this.writer(key, value);
        } catch (error) {
          // Log error silently or use provided error handler
          if (this.options.onError && typeof this.options.onError === 'function') {
            this.options.onError(`Failed to flush write for key ${key}`, error);
          }
          // Re-queue failed writes
          this.pendingWrites.set(key, { value, timestamp: Date.now() });
        }
      });

      await Promise.all(promises);
    } finally {
      this.isFlushing = false;
    }
  }

  async destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Final flush
    await this._flush();
  }
}

/**
 * LRU Cache with TTL support
 */
class LRUCache {
  constructor(maxSize = 1000, defaultTTL = 300000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.accessOrder = new Map(); // key -> access counter
    this.expirationTimes = new Map(); // key -> expiration timestamp
    this.accessCounter = 0;
  }

  async get(key) {
    if (!this.cache.has(key)) return null;

    // Check expiration
    const expiration = this.expirationTimes.get(key);
    if (expiration && Date.now() > expiration) {
      this.delete(key);
      return null;
    }

    // Update access order
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
    return this.cache.get(key);
  }

  async set(key, value, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const expiration = Date.now() + ttl;

    // If cache is full and key is new, evict least recently used
    if (!this.cache.has(key) && this.size >= this.maxSize) {
      this._evictLRU();
    }

    this.cache.set(key, value);
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
    this.expirationTimes.set(key, expiration);

    return true;
  }

  async delete(key) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.expirationTimes.delete(key);
  }

  _evictLRU() {
    let oldestKey = null;
    let oldestAccess = this.accessCounter + 1; // Start with higher than current counter

    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  get size() {
    return this.cache.size;
  }
}

/**
 * Cache warming with priority queue
 */
class PriorityCacheWarmer {
  constructor(cache, fetcher, options = {}) {
    this.cache = cache;
    this.fetcher = fetcher;
    this.options = options;
    this.concurrency = options.concurrency || 5;
    this.retryAttempts = options.retryAttempts || 3;
    this.queue = [];
    this.isProcessing = false;
  }

  addToQueue(key, priority = 0, options = {}) {
    this.queue.push({ key, priority, options, attempts: 0 });
    this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first
    // Don't auto-start processing
  }

  async process() {
    await this._processQueue();
  }

  async warm(keys, options = {}) {
    const items = keys.map(key => ({
      key,
      priority: options.priority || 0,
      options: options.itemOptions || {},
      attempts: 0
    }));

    this.queue.push(...items);
    this.queue.sort((a, b) => b.priority - a.priority);
    this._processQueue();
  }

  async _processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      // Process items sequentially to maintain priority order
      while (this.queue.length > 0) {
        const item = this.queue.shift(); // Remove highest priority item
        try {
          const value = await this.fetcher(item.key);
          await this.cache.set(item.key, value, item.options);
        } catch (error) {
          item.attempts++;
          if (item.attempts < this.retryAttempts) {
            // Re-queue with lower priority
            this.queue.push({ ...item, priority: item.priority - 1 });
            this.queue.sort((a, b) => b.priority - a.priority);
          } else {
            // Log error silently or use provided error handler
            if (this.options.onError && typeof this.options.onError === 'function') {
              this.options.onError(`Failed to warm cache for key ${item.key} after ${item.attempts} attempts`, error);
            }
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

/**
 * Distributed cache coordination
 */
class DistributedCacheCoordinator {
  constructor(caches, options = {}) {
    this.caches = Array.isArray(caches) ? caches : [caches];
    this.options = options;
    this.replicationFactor = options.replicationFactor || 1;
    this.consistencyLevel = options.consistencyLevel || 'eventual'; // eventual, strong
  }

  async get(key) {
    const promises = this.caches.map(cache => cache.get(key));
    const results = await Promise.allSettled(promises);

    // Return first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        // Update other caches asynchronously for consistency
        this._replicateToOthers(key, result.value, result.value);
        return result.value;
      }
    }

    return null;
  }

  async set(key, value, options = {}) {
    const promises = this.caches.slice(0, this.replicationFactor).map(cache =>
      cache.set(key, value, options)
    );

    if (this.consistencyLevel === 'strong') {
      await Promise.all(promises);
    } else {
      // Fire and forget for eventual consistency
      Promise.all(promises).catch(error => {
        // Log error silently or use provided error handler
        if (this.options.onError && typeof this.options.onError === 'function') {
          this.options.onError('Distributed cache replication error', error);
        }
      });
    }

    return true;
  }

  async delete(key) {
    const promises = this.caches.map(cache => cache.delete(key));
    await Promise.allSettled(promises);
  }

  _replicateToOthers(key, value, excludeCache) {
    const otherCaches = this.caches.filter(cache => cache !== excludeCache);
    otherCaches.forEach(async (cache) => {
      try {
        await cache.set(key, value);
      } catch (error) {
        // Ignore replication errors
      }
    });
  }
}

/**
 * Cache metrics collector
 */
class CacheMetricsCollector {
  constructor(options = {}) {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      errors: 0
    };
    this.resetInterval = options.resetInterval || 3600000; // 1 hour

    // Periodic reset
    this.resetTimer = setInterval(() => this.reset(), this.resetInterval);
  }

  recordHit() { this.metrics.hits++; }
  recordMiss() { this.metrics.misses++; }
  recordSet() { this.metrics.sets++; }
  recordDelete() { this.metrics.deletes++; }
  recordEviction() { this.metrics.evictions++; }
  recordError() { this.metrics.errors++; }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      totalOperations: total + this.metrics.sets + this.metrics.deletes
    };
  }

  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });
  }

  destroy() {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
    }
  }
}

/**
 * Legacy cache invalidation function for backward compatibility
 */
function cacheInvalidation(cache, pattern) {
  // For in-memory cache
  if (cache.store && typeof cache.store.keys === 'function') {
    for (const key of cache.store.keys()) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  }
  // For distributed caches, would need async deletion
}

module.exports = {
  CacheAsidePattern,
  WriteThroughPattern,
  WriteBehindPattern,
  LRUCache,
  PriorityCacheWarmer,
  DistributedCacheCoordinator,
  CacheMetricsCollector,
  // Legacy functions for backward compatibility
  cacheWarming: async (cache, keys, fetcher) => {
    const warmer = new PriorityCacheWarmer(cache, fetcher);
    await warmer.warm(keys);
  },
  cacheInvalidation
};