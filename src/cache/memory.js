/**
 * In-memory cache for edge environments
 * @module edge-utils/cache/memory
 */
class MemoryCache {
  constructor(options = {}) {
    this.store = new Map();
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 300;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    if (this.store.size >= this.maxSize) {
      this.evict();
    }
    this.store.set(key, {
      value,
      expires: Date.now() + this.ttl * 1000
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  evict() {
    // FIFO eviction: remove the first inserted
    const keys = Array.from(this.store.keys());
    if (keys.length > 0) {
      this.store.delete(keys[0]);
    }
  }
}

module.exports = { MemoryCache };