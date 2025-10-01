# Advanced Caching

The advanced caching utilities provide sophisticated caching strategies and patterns specifically designed for edge environments, supporting multiple storage backends, cache warming, invalidation, and performance optimization.

## Features

- Multiple Backends: Memory, KV, Redis, and custom storage support
- Advanced Strategies: Write-through, write-behind, cache-aside patterns
- Cache Warming: Pre-populate cache for optimal performance
- Smart Invalidation: Pattern-based and selective cache invalidation
- Performance Monitoring: Cache hit rates, latency, and usage metrics
- Distributed Caching: Multi-region cache synchronization
- Edge Optimized: Low-latency operations for edge environments
- Consistency: Strong consistency guarantees with conflict resolution

## Quick Start

```js
const { MemoryCache, EdgeCache, WriteThroughPattern } = require('edge-utils/cache');

// Memory cache
const memoryCache = new MemoryCache({ ttl: 300, maxSize: 1000 });

// Edge cache (KV-based)
const edgeCache = new EdgeCache({
  kv: kvStorage,
  ttl: 600,
  compression: true
});

// Write-through caching pattern
const writeThrough = new WriteThroughPattern({
  cache: edgeCache,
  storage: databaseStorage,
  ttl: 300
});

// Cache operations
await writeThrough.set('user:123', { id: 123, name: 'John' });
const user = await writeThrough.get('user:123');
```

## Cache Backends

### MemoryCache

In-memory cache with TTL and size limits.

```js
const cache = new MemoryCache({
  ttl: 300,                    // Default TTL in seconds
  maxSize: 1000,               // Maximum number of entries
  compression: false,          // Enable compression
  cleanupInterval: 60000       // Cleanup interval in ms
});

// Basic operations
await cache.set('key', 'value', { ttl: 60 });
const value = await cache.get('key');
await cache.delete('key');
await cache.clear();

// Batch operations
await cache.setMany([
  ['key1', 'value1'],
  ['key2', 'value2']
]);
const values = await cache.getMany(['key1', 'key2']);

// Cache statistics
const stats = cache.getStats();
console.log(`Size: ${stats.size}, Hits: ${stats.hits}, Misses: ${stats.misses}`);
```

### EdgeCache

KV-based cache optimized for edge environments.

```js
const cache = new EdgeCache({
  kv: kvStorage,               // KV storage instance
  ttl: 600,                    // Default TTL in seconds
  compression: true,           // Enable gzip compression
  namespace: 'cache',          // KV namespace
  serialization: 'json'        // Serialization format
});

// Operations (same as MemoryCache)
await cache.set('user:123', userData);
const user = await cache.get('user:123');
```

### RedisCache

Redis-based distributed cache.

```js
const cache = new RedisCache({
  url: 'redis://localhost:6379',
  ttl: 300,
  compression: true,
  cluster: false,
  password: 'password'
});

// Operations (same as MemoryCache)
await cache.set('session:abc', sessionData);
const session = await cache.get('session:abc');
```

### Custom Cache Backend

```js
class CustomCache extends BaseCache {
  async get(key) {
    // Implement get logic
  }

  async set(key, value, options) {
    // Implement set logic
  }

  async delete(key) {
    // Implement delete logic
  }

  async clear() {
    // Implement clear logic
  }

  getStats() {
    // Return cache statistics
  }
}
```

## Caching Patterns

### Cache-Aside Pattern

Application manages cache directly.

```js
const { CacheAsidePattern } = require('edge-utils/cache');

const cacheAside = new CacheAsidePattern({
  cache: new EdgeCache({ kv: kvStorage }),
  loader: async (key) => {
    // Load data from source
    return await database.get(key);
  },
  ttl: 300
});

// Get data (cache miss loads from source)
const data = await cacheAside.get('user:123');

// Manual cache update
await cacheAside.set('user:123', updatedData);
```

### Write-Through Pattern

Writes go through cache to storage.

```js
const { WriteThroughPattern } = require('edge-utils/cache');

const writeThrough = new WriteThroughPattern({
  cache: new EdgeCache({ kv: kvStorage }),
  storage: databaseStorage,
  ttl: 300,
  writeTimeout: 5000
});

// Write operation updates both cache and storage
await writeThrough.set('user:123', userData);

// Read operation uses cache
const user = await writeThrough.get('user:123');
```

### Write-Behind Pattern

Writes to cache, asynchronously to storage.

```js
const { WriteBehindPattern } = require('edge-utils/cache');

const writeBehind = new WriteBehindPattern({
  cache: new MemoryCache({ ttl: 3600 }),
  storage: databaseStorage,
  batchSize: 10,               // Batch size for writes
  flushInterval: 5000,         // Flush interval in ms
  retryAttempts: 3             // Retry failed writes
});

// Fast writes to cache
await writeBehind.set('user:123', userData);

// Data is flushed to storage asynchronously
// Use flush() to force immediate write
await writeBehind.flush();
```

### Cache Warming

Pre-populate cache for optimal performance.

```js
const { cacheWarming } = require('edge-utils/cache');

const cache = new EdgeCache({ kv: kvStorage });

// Warm cache with popular data
await cacheWarming(cache, [
  'user:123',
  'user:456',
  'product:789'
], async (key) => {
  return await database.get(key);
});

// Warm cache with custom logic
await cacheWarming(cache, keys, async (key) => {
  const data = await expensiveOperation(key);
  return data;
}, {
  concurrency: 5,              // Concurrent warming operations
  timeout: 30000,              // Timeout per operation
  onProgress: (completed, total) => {
    console.log(`Warmed ${completed}/${total} keys`);
  }
});
```

## Cache Invalidation

### Pattern-Based Invalidation

```js
const { cacheInvalidation } = require('edge-utils/cache');

const cache = new EdgeCache({ kv: kvStorage });

// Invalidate by pattern
await cacheInvalidation(cache, 'user:*', {
  strategy: 'delete',          // 'delete' or 'touch'
  recursive: true              // Invalidate nested patterns
});

// Invalidate specific keys
await cacheInvalidation(cache, ['user:123', 'user:456']);

// Invalidate with custom filter
await cacheInvalidation(cache, (key) => {
  return key.startsWith('temp:');
});
```

### Selective Invalidation

```js
// Invalidate by tags
await cache.tag('user:123', ['user', 'profile']);
await cache.tag('user:456', ['user', 'profile']);

// Invalidate all keys with specific tag
await cache.invalidateTag('user');

// Invalidate by namespace
await cache.invalidateNamespace('session');
```

## Performance Monitoring

### Cache Metrics

```js
const cache = new MemoryCache({ ttl: 300 });

// Enable metrics collection
cache.enableMetrics();

// Get performance metrics
const metrics = cache.getMetrics();
console.log(`Hit rate: ${(metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(2)}%`);
console.log(`Average get time: ${metrics.averageGetTime}ms`);
console.log(`Average set time: ${metrics.averageSetTime}ms`);
console.log(`Cache size: ${metrics.size}`);
console.log(`Evictions: ${metrics.evictions}`);
```

### Cache Statistics

```js
const stats = cache.getStats();
console.log({
  size: stats.size,
  capacity: stats.capacity,
  hitRate: stats.hitRate,
  missRate: stats.missRate,
  evictionRate: stats.evictionRate,
  averageTTLS: stats.averageTTL
});
```

## Distributed Caching

### Multi-Region Synchronization

```js
const { DistributedCache } = require('edge-utils/cache');

const distributedCache = new DistributedCache({
  localCache: new MemoryCache({ ttl: 300 }),
  remoteCache: new EdgeCache({ kv: kvStorage }),
  regions: ['us-east', 'us-west', 'eu-west'],
  syncInterval: 30000,         // Sync interval in ms
  conflictResolution: 'latest' // 'latest', 'merge', or custom function
});

// Operations are automatically synchronized
await distributedCache.set('global:key', data);
const value = await distributedCache.get('global:key');
```

### Cache Replication

```js
const { CacheReplication } = require('edge-utils/cache');

const replication = new CacheReplication({
  primary: new EdgeCache({ kv: primaryKV }),
  replicas: [
    new EdgeCache({ kv: replicaKV1 }),
    new EdgeCache({ kv: replicaKV2 })
  ],
  replicationFactor: 2,        // Number of replicas to write to
  consistency: 'eventual'      // 'strong' or 'eventual'
});

// Writes are replicated to multiple stores
await replication.set('key', value);
```

## Advanced Features

### Cache Compression

```js
const cache = new EdgeCache({
  kv: kvStorage,
  compression: true,
  compressionThreshold: 1024,  // Compress values > 1KB
  compressionLevel: 6          // Compression level (1-9)
});

// Large values are automatically compressed
await cache.set('large-data', bigObject);
const data = await cache.get('large-data'); // Automatically decompressed
```

### Cache Encryption

```js
const cache = new EdgeCache({
  kv: kvStorage,
  encryption: true,
  encryptionKey: 'your-encryption-key',
  encryptionAlgorithm: 'AES-256-GCM'
});

// Data is encrypted at rest
await cache.set('sensitive-data', secretData);
const data = await cache.get('sensitive-data'); // Automatically decrypted
```

### Cache TTL Management

```js
// Dynamic TTL based on data type
const cache = new MemoryCache({
  ttl: (key, value) => {
    if (key.startsWith('session:')) return 3600;  // 1 hour
    if (key.startsWith('user:')) return 1800;    // 30 minutes
    return 300;  // 5 minutes default
  }
});

// Sliding expiration
await cache.set('sliding:key', value, {
  ttl: 300,
  sliding: true  // TTL resets on access
});

// Absolute expiration
await cache.set('absolute:key', value, {
  ttl: 300,
  sliding: false
});
```

## Middleware Integration

### Cache Middleware

```js
const { createCacheMiddleware } = require('edge-utils/cache');

const cacheMiddleware = createCacheMiddleware({
  cache: new EdgeCache({ kv: kvStorage }),
  ttl: 300,
  keyGenerator: (request) => {
    return `${request.method}:${request.url}`;
  },
  shouldCache: (request, response) => {
    return response.status === 200 && request.method === 'GET';
  }
});

// Use in request pipeline
const response = await cacheMiddleware(request, async () => {
  return await fetchData(request);
});
```

### HTTP Cache Headers

```js
const { generateCacheHeaders } = require('edge-utils/cache');

// Generate HTTP cache headers
const headers = generateCacheHeaders({
  maxAge: 300,                 // Cache for 5 minutes
  sMaxAge: 600,                // CDN cache for 10 minutes
  staleWhileRevalidate: 86400, // Serve stale for 1 day while revalidating
  etag: '"abc123"',            // Entity tag
  lastModified: new Date()      // Last modified date
});

const response = new Response(data, { headers });
```

## Performance Optimization

### Cache Warming Strategies

```js
// Warm cache on startup
async function warmCache() {
  const popularKeys = await getPopularKeys();
  await cacheWarming(cache, popularKeys, loader, {
    concurrency: 10,
    onError: (key, error) => {
      console.error(`Failed to warm ${key}:`, error);
    }
  });
}

// Warm cache based on access patterns
async function adaptiveWarming() {
  const accessPatterns = await analyzeAccessLogs();
  const keysToWarm = accessPatterns
    .filter(pattern => pattern.frequency > threshold)
    .map(pattern => pattern.key);

  await cacheWarming(cache, keysToWarm, loader);
}
```

### Memory Management

```js
// Implement cache size limits
const cache = new MemoryCache({
  maxSize: 10000,
  evictionPolicy: 'lru',       // 'lru', 'lfu', or 'fifo'
  onEviction: (key, value) => {
    console.log(`Evicted ${key}`);
  }
});

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  const stats = cache.getStats();

  if (stats.size > 8000) {      // 80% capacity
    console.warn('Cache near capacity, consider increasing size or implementing eviction');
  }

  if (usage.heapUsed > 100 * 1024 * 1024) { // 100MB
    cache.clear(); // Emergency cleanup
  }
}, 30000);
```

### Performance Benchmarks

```js
const { benchmarkCache } = require('edge-utils/cache');

const results = await benchmarkCache(cache, {
  operations: 10000,
  concurrency: 100,
  keySize: 32,
  valueSize: 1024
});

console.log(`Throughput: ${results.throughput} ops/sec`);
console.log(`Average latency: ${results.averageLatency}ms`);
console.log(`P95 latency: ${results.p95Latency}ms`);
console.log(`Error rate: ${results.errorRate}%`);
```

## Platform-Specific Notes

### Cloudflare Workers
- Use Cloudflare KV for distributed caching
- Leverage Durable Objects for advanced caching patterns
- Consider cache zones for geographic distribution

### Vercel Edge Functions
- Use Vercel KV for caching
- Compatible with Edge Config for configuration
- Support for regional cache invalidation

### Deno Deploy
- Use Deno KV for caching
- Native performance with Deno runtime
- Support for cache compression and encryption

## Best Practices

### Cache Key Design
```js
// Good key design
const userKey = `user:${userId}`;
const productKey = `product:${productId}:${version}`;
const listKey = `list:${type}:${page}:${limit}:${sort}`;

// Avoid
const badKey = `data-${JSON.stringify(params)}`; // Too long, not queryable
```

### Cache TTL Strategy
```js
// Different TTLs for different data types
const ttlStrategy = {
  static: 86400,     // 24 hours for static data
  user: 1800,        // 30 minutes for user data
  session: 3600,     // 1 hour for sessions
  api: 300          // 5 minutes for API responses
};
```

### Error Handling
```js
// Implement circuit breaker for cache failures
const cacheWithCircuitBreaker = withCircuitBreaker(cache, {
  failureThreshold: 5,
  recoveryTimeout: 30000
});

try {
  const data = await cacheWithCircuitBreaker.get(key);
} catch (error) {
  // Fallback to direct data source
  const data = await database.get(key);
}
```

## Testing

Run cache tests with:

```bash
npm test -- --testPathPattern=cache.test.js
npm test -- --testPathPattern=advanced-cache.test.js
```

## API Reference

### Cache Interface
- `get(key)` - Get value by key
- `set(key, value, options)` - Set value with options
- `delete(key)` - Delete value by key
- `clear()` - Clear all values
- `has(key)` - Check if key exists
- `getMany(keys)` - Get multiple values
- `setMany(entries)` - Set multiple values
- `deleteMany(keys)` - Delete multiple values
- `getStats()` - Get cache statistics
- `getMetrics()` - Get performance metrics

### Cache Patterns
- `CacheAsidePattern` - Cache-aside pattern implementation
- `WriteThroughPattern` - Write-through pattern implementation
- `WriteBehindPattern` - Write-behind pattern implementation

### Utilities
- `cacheWarming(cache, keys, loader, options)` - Warm cache with data
- `cacheInvalidation(cache, pattern, options)` - Invalidate cache entries
- `generateCacheHeaders(options)` - Generate HTTP cache headers
- `benchmarkCache(cache, options)` - Benchmark cache performance

## Contributing

When contributing to caching utilities:

1. Maintain backward compatibility
2. Add comprehensive performance tests
3. Update documentation for new features
4. Follow established caching patterns
5. Test across all supported platforms and backends

## License

MIT