# edge-utils

Platform-agnostic utilities for edge computing and serverless environments.

## Quick Start
```js
const { createEdgeHandler } = require('edge-utils');

const handler = createEdgeHandler({
  cache: { strategy: 'memory', ttl: 300 },
  geo: { routing: 'nearest', regions: ['us', 'eu', 'asia'] },
  cors: { origins: ['*'], methods: ['GET', 'POST'] }
});

module.exports = handler;
```

## Platform Compatibility Matrix
| Platform            | Supported | Notes |
|---------------------|-----------|-------|
| Cloudflare Workers  | Yes       | Full KV support |
| Vercel Edge         | Yes       | Edge Config support |
| Deno Deploy         | Yes       | Deno KV support |
| AWS Lambda@Edge     | Yes       | Basic support |
| Node.js Serverless  | Yes       | Fallback mode |

## API Documentation

### Core
- `createEdgeHandler(options)` - Universal handler creator
- `detectPlatform()` - Detects current runtime
- `isCloudflareWorker()`, `isVercelEdge()` - Platform checks

### Caching
- `MemoryCache` - In-memory cache with TTL
- `EdgeCache` - Platform-specific cache (KV, Edge Config)
- `cacheWarming(cache, keys, fetcher)` - Pre-populate cache
- `cacheInvalidation(cache, pattern)` - Remove matching keys

### Geo
- `geoRoute(headers, regions)` - Route based on location
- `getCountry(headers)` - Extract country from headers
- `nearestRegion(userRegion, availableRegions)` - Find closest region

### Performance
- `minimizeColdStart(init)` - Run initialization once
- `keepAlive(interval)` - Prevent cold starts
- `streamResponse(stream, headers)` - Stream responses
- `compressGzip(data)`, `compressBrotli(data)` - Compress data

### Error Handling
- `EdgeError` - Custom error class
- `handleError(error, options)` - Standardized error responses
- `retryWithBackoff(fn, attempts)` - Retry with exponential backoff
- `circuitBreaker(fn, threshold, timeout)` - Circuit breaker pattern

## Examples
- [Cloudflare Workers](./examples/cloudflare-worker.js)
- [Vercel Edge](./examples/vercel-edge.js)
- [Deno Deploy](./examples/deno-deploy.js)
- [Generic Serverless](./examples/generic-serverless.js)

## Installation
```bash
npm install edge-utils
```

## Build
```bash
npm run build
```

## Test
```bash
npm test
```

## Performance Benchmarks
- Bundle size: < 15KB gzipped
- Load time: < 50ms on edge runtimes
- Memory usage: Minimal footprint

## Contributing
PRs welcome. Ensure tests pass and bundle size remains under 15KB.

## License
MIT