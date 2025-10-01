---
title: "Cache Manager API"
description: "Complete API reference for the caching utilities"
---

# Cache Manager API Reference

The Cache Manager provides a unified interface for various caching strategies and backends optimized for edge environments.

## CacheManager

Main cache management class supporting multiple backends and strategies.

### Constructor

```js
new CacheManager(options)
```

**Parameters:**
- `options` (object): Cache configuration options

**Options:**
- `backend` (string): Cache backend ('memory', 'redis', 'cloudflare-kv')
- `ttl` (number): Default TTL in milliseconds
- `maxSize` (number): Maximum cache size
- `strategy` (string): Eviction strategy ('lru', 'lfu', 'fifo')
- `compression` (boolean): Enable compression
- `namespace` (string): Cache namespace

### Methods

#### get(key, options)

Retrieve a value from cache.

```js
const value = await cache.get('user:123');
```

**Parameters:**
- `key` (string): Cache key
- `options` (object, optional): Get options

**Returns:** Promise resolving to cached value or undefined

#### set(key, value, options)

Store a value in cache.

```js
await cache.set('user:123', userData, { ttl: 300000 });
```

**Parameters:**
- `key` (string): Cache key
- `value` (any): Value to cache
- `options` (object, optional): Set options

#### delete(key)

Remove a value from cache.

```js
await cache.delete('user:123');
```

**Parameters:**
- `key` (string): Cache key

#### clear()

Clear all cached values.

```js
await cache.clear();
```

#### has(key)

Check if key exists in cache.

```js
const exists = await cache.has('user:123');
```

**Parameters:**
- `key` (string): Cache key

**Returns:** Promise resolving to boolean

#### getStats()

Get cache statistics.

```js
const stats = await cache.getStats();
// { hits: 150, misses: 25, size: 175, hitRate: 0.857 }
```

**Returns:** Promise resolving to statistics object

#### memoize(fn, options)

Create a memoized version of a function.

```js
const getUser = cache.memoize(
  async (id) => await fetchUserFromDB(id),
  { ttl: 300000, keyFn: (id) => `user:${id}` }
);

const user = await getUser('123'); // Cached automatically
```

**Parameters:**
- `fn` (function): Function to memoize
- `options` (object, optional): Memoization options

**Returns:** Memoized function

## Cache Strategies

### LRU (Least Recently Used)

```js
const cache = new CacheManager({
  strategy: 'lru',
  maxSize: 1000
});
```

### LFU (Least Frequently Used)

```js
const cache = new CacheManager({
  strategy: 'lfu',
  maxSize: 1000
});
```

### FIFO (First In, First Out)

```js
const cache = new CacheManager({
  strategy: 'fifo',
  maxSize: 1000
});
```

## Cache Backends

### Memory Backend

```js
const cache = new CacheManager({
  backend: 'memory',
  maxSize: 1000
});
```

### Redis Backend

```js
const cache = new CacheManager({
  backend: 'redis',
  url: 'redis://localhost:6379',
  ttl: 300000
});
```

### Cloudflare KV Backend

```js
const cache = new CacheManager({
  backend: 'cloudflare-kv',
  namespace: 'my-app-cache'
});
```

## Cache Patterns

### Read-Through Caching

```js
class ReadThroughCache {
  constructor(cache, dataSource) {
    this.cache = cache;
    this.dataSource = dataSource;
  }

  async get(key) {
    let value = await this.cache.get(key);
    if (!value) {
      value = await this.dataSource.get(key);
      if (value) {
        await this.cache.set(key, value);
      }
    }
    return value;
  }
}
```

### Write-Through Caching

```js
class WriteThroughCache {
  constructor(cache, dataSource) {
    this.cache = cache;
    this.dataSource = dataSource;
  }

  async set(key, value) {
    await this.dataSource.set(key, value);
    await this.cache.set(key, value);
  }
}
```

### Cache-Aside Pattern

```js
class CacheAside {
  constructor(cache, dataSource) {
    this.cache = cache;
    this.dataSource = dataSource;
  }

  async get(key) {
    let value = await this.cache.get(key);
    if (!value) {
      value = await this.dataSource.get(key);
      if (value) {
        await this.cache.set(key, value);
      }
    }
    return value;
  }

  async set(key, value) {
    await this.dataSource.set(key, value);
    await this.cache.set(key, value);
  }
}
```

## Type Definitions

### CacheOptions

```typescript
interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compression?: boolean;
}
```

### CacheStats

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}
```

### MemoizeOptions

```typescript
interface MemoizeOptions extends CacheOptions {
  keyFn?: (...args: any[]) => string;
  maxAge?: number;
}
```