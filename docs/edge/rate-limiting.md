# Rate Limiting & Traffic Control

The rate limiting utilities provide comprehensive traffic control, API protection, and resource management for edge environments. These utilities help prevent abuse, ensure fair resource allocation, and maintain service stability under load.

## Features

- Multiple Algorithms: Fixed window, sliding window, token bucket, leaky bucket
- Flexible Keys: IP-based, user-based, API key-based, custom keys
- Real-time Monitoring: Request tracking and rate limit status
- Distributed: Works across multiple edge locations
- High Performance: Low-overhead rate limiting with caching
- Auto-scaling: Dynamic limit adjustment based on load
- Analytics: Rate limiting metrics and reporting
- Security: DDoS protection and abuse prevention

## Quick Start

```js
const { RateLimiter, RateLimitStore } = require('edge-utils/rate-limiting');

// Create rate limiter
const rateLimiter = new RateLimiter({
  limit: 100,                    // 100 requests
  window: 60000,                 // per 60 seconds (1 minute)
  algorithm: 'sliding-window',   // algorithm to use
  keyGenerator: 'ip',            // key based on IP address
  store: new RateLimitStore()    // storage backend
});

// Use in request handler
const handler = async (request) => {
  const result = await rateLimiter.check(request);

  if (!result.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      }
    });
  }

  // Process request
  const response = await processRequest(request);

  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

  return response;
};
```

## Rate Limiting Algorithms

### Fixed Window

Divides time into fixed intervals and counts requests within each window.

```js
const fixedWindowLimiter = new RateLimiter({
  algorithm: 'fixed-window',
  limit: 100,
  window: 60000,  // 1 minute windows
  keyGenerator: 'ip'
});

// Example: 100 requests per minute
// Window 1: 00:00-00:59 -> 100 requests allowed
// Window 2: 01:00-01:59 -> 100 requests allowed (fresh window)
```

### Sliding Window

Provides smoother rate limiting by considering a rolling time window.

```js
const slidingWindowLimiter = new RateLimiter({
  algorithm: 'sliding-window',
  limit: 100,
  window: 60000,  // 1 minute sliding window
  precision: 10000, // 10 second buckets
  keyGenerator: 'ip'
});

// More accurate rate limiting
// Considers requests in the last 60 seconds continuously
```

### Token Bucket

Allows bursts of traffic while maintaining average rate limits.

```js
const tokenBucketLimiter = new RateLimiter({
  algorithm: 'token-bucket',
  capacity: 100,        // Bucket capacity
  refillRate: 10,       // Tokens per second
  initialTokens: 100,   // Starting tokens
  keyGenerator: 'ip'
});

// Allows bursts up to capacity
// Refills at constant rate
// Good for handling traffic spikes
```

### Leaky Bucket

Smooths traffic by processing requests at a constant rate.

```js
const leakyBucketLimiter = new RateLimiter({
  algorithm: 'leaky-bucket',
  capacity: 100,        // Bucket capacity
  leakRate: 10,         // Requests per second
  keyGenerator: 'ip'
});

// Processes requests at constant rate
// Queues excess requests
// Good for steady traffic patterns
```

## Key Generators

### IP-based Limiting

Rate limit based on client IP address.

```js
const ipLimiter = new RateLimiter({
  limit: 100,
  window: 60000,
  keyGenerator: 'ip',
  // Optional: trusted proxies for IP detection
  trustedProxies: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
});

// Extract IP from various headers
const getClientIP = (request) => {
  // Check X-Forwarded-For, X-Real-IP, CF-Connecting-IP, etc.
  return extractIP(request);
};
```

### User-based Limiting

Rate limit based on authenticated user ID.

```js
const userLimiter = new RateLimiter({
  limit: 1000,
  window: 3600000,  // 1 hour
  keyGenerator: (request) => {
    // Extract user ID from JWT, session, etc.
    const userId = getUserId(request);
    return userId ? `user:${userId}` : null;
  }
});

// Different limits for different user tiers
const tieredLimiter = new RateLimiter({
  limit: (request) => {
    const user = getUser(request);
    return user.tier === 'premium' ? 1000 : 100;
  },
  window: 3600000,
  keyGenerator: (request) => `user:${getUserId(request)}`
});
```

### API Key-based Limiting

Rate limit based on API keys.

```js
const apiKeyLimiter = new RateLimiter({
  limit: 10000,
  window: 86400000,  // 24 hours
  keyGenerator: (request) => {
    const apiKey = request.headers.get('X-API-Key');
    return apiKey ? `apikey:${apiKey}` : null;
  }
});

// Per-endpoint limiting
const endpointLimiter = new RateLimiter({
  limit: 100,
  window: 60000,
  keyGenerator: (request) => {
    const apiKey = request.headers.get('X-API-Key');
    const endpoint = new URL(request.url).pathname;
    return `${apiKey}:${endpoint}`;
  }
});
```

### Custom Key Generators

Create custom keys based on any request attributes.

```js
// Rate limit by IP and endpoint
const endpointLimiter = new RateLimiter({
  limit: 50,
  window: 60000,
  keyGenerator: (request) => {
    const ip = getClientIP(request);
    const endpoint = new URL(request.url).pathname;
    return `${ip}:${endpoint}`;
  }
});

// Rate limit by user agent
const userAgentLimiter = new RateLimiter({
  limit: 10,
  window: 60000,
  keyGenerator: (request) => {
    const ua = request.headers.get('User-Agent') || 'unknown';
    return `ua:${ua}`;
  }
});

// Geographic rate limiting
const geoLimiter = new RateLimiter({
  limit: (request) => {
    const country = getCountry(request);
    return country === 'US' ? 100 : 50;
  },
  window: 60000,
  keyGenerator: (request) => {
    const country = getCountry(request);
    return `country:${country}`;
  }
});
```

## Rate Limit Store

Storage backend for rate limiting data with multiple implementations.

### In-Memory Store

Simple in-memory storage for single-instance deployments.

```js
const memoryStore = new RateLimitStore({
  type: 'memory',
  cleanupInterval: 60000  // Clean up expired entries every minute
});
```

### Distributed Store

Distributed storage for multi-instance deployments.

```js
// KV-based store (Cloudflare Workers, etc.)
const kvStore = new RateLimitStore({
  type: 'kv',
  namespace: 'rate-limits',
  storage: kvStorage
});

// Redis-based store
const redisStore = new RateLimitStore({
  type: 'redis',
  url: 'redis://localhost:6379',
  keyPrefix: 'ratelimit:',
  ttl: 3600
});

// Custom store implementation
class CustomStore extends RateLimitStore {
  async get(key) {
    // Custom get implementation
    return await customStorage.get(key);
  }

  async set(key, value, ttl) {
    // Custom set implementation
    await customStorage.set(key, value, { ttl });
  }

  async increment(key, amount = 1) {
    // Custom increment implementation
    const current = await this.get(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }
}
```

## Advanced Configuration

### Burst Handling

Allow temporary bursts while maintaining average limits.

```js
const burstLimiter = new RateLimiter({
  algorithm: 'token-bucket',
  capacity: 1000,       // Burst capacity
  refillRate: 100,      // Sustained rate (100 per second)
  initialTokens: 100,   // Starting tokens
  burstMultiplier: 2    // Allow 2x burst capacity
});
```

### Dynamic Limits

Adjust limits based on time, load, or other factors.

```js
const dynamicLimiter = new RateLimiter({
  limit: () => {
    const hour = new Date().getHours();
    // Higher limits during business hours
    return hour >= 9 && hour <= 17 ? 1000 : 500;
  },
  window: 3600000,
  keyGenerator: 'ip'
});

// Load-based limits
const loadBasedLimiter = new RateLimiter({
  limit: (request) => {
    const load = getCurrentLoad(); // 0-1 scale
    return Math.floor(1000 * (1 - load)); // Reduce limits under load
  },
  window: 60000,
  keyGenerator: 'ip'
});
```

### Multi-tier Rate Limiting

Apply multiple rate limits with different scopes.

```js
const multiTierLimiter = new MultiTierRateLimiter([
  // Global limit
  {
    name: 'global',
    limit: 10000,
    window: 60000,
    keyGenerator: () => 'global'
  },
  // Per-IP limit
  {
    name: 'ip',
    limit: 100,
    window: 60000,
    keyGenerator: 'ip'
  },
  // Per-user limit
  {
    name: 'user',
    limit: 1000,
    window: 3600000,
    keyGenerator: (request) => `user:${getUserId(request)}`
  }
]);

// Check all tiers
const result = await multiTierLimiter.check(request);
if (!result.allowed) {
  // Return most restrictive limit info
  const limitingTier = result.violatedTiers[0];
  return createRateLimitResponse(limitingTier);
}
```

## Middleware Integration

### Rate Limiting Middleware

```js
const { RateLimiter, RateLimitStore } = require('edge-utils/rate-limiting');

// Create rate limiter
const rateLimiter = new RateLimiter({
  limit: 100,
  window: 60000,
  algorithm: 'sliding-window',
  keyGenerator: 'ip',
  store: new RateLimitStore({ type: 'memory' })
});

// Rate limiting middleware
const rateLimitingMiddleware = async (request, context) => {
  const result = await rateLimiter.check(request);

  if (!result.allowed) {
    // Create rate limit exceeded response
    const response = new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      }
    });

    // Add rate limit info to response body
    const rateLimitInfo = {
      error: 'rate_limit_exceeded',
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      resetIn: Math.ceil((result.resetTime - Date.now()) / 1000)
    };

    response.headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(rateLimitInfo), {
      status: 429,
      headers: response.headers
    });
  }

  // Add rate limit headers to successful requests
  context.rateLimit = result;

  return context.next();
};

// Headers middleware (adds rate limit headers to all responses)
const rateLimitHeadersMiddleware = async (request, context) => {
  const response = await context.next();

  if (context.rateLimit) {
    response.headers.set('X-RateLimit-Limit', context.rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', context.rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', context.rateLimit.resetTime.toString());
  }

  return response;
};

// Apply middleware
const handler = applyMiddleware([
  rateLimitingMiddleware,
  rateLimitHeadersMiddleware
], baseHandler);
```

### Per-Endpoint Rate Limiting

```js
// Different limits for different endpoints
const endpointLimits = {
  '/api/users': { limit: 100, window: 60000 },
  '/api/orders': { limit: 50, window: 60000 },
  '/api/search': { limit: 20, window: 60000 },
  '/api/admin': { limit: 10, window: 60000 }
};

const endpointLimiter = new RateLimiter({
  limit: (request) => {
    const path = new URL(request.url).pathname;
    const config = endpointLimits[path] || { limit: 100, window: 60000 };
    return config.limit;
  },
  window: (request) => {
    const path = new URL(request.url).pathname;
    const config = endpointLimits[path] || { limit: 100, window: 60000 };
    return config.window;
  },
  keyGenerator: 'ip'
});
```

### User Tier-based Limiting

```js
// Rate limits based on user subscription tier
const tierLimits = {
  free: { limit: 100, window: 3600000 },
  basic: { limit: 1000, window: 3600000 },
  premium: { limit: 10000, window: 3600000 },
  enterprise: { limit: 100000, window: 3600000 }
};

const tierLimiter = new RateLimiter({
  limit: (request) => {
    const user = getUser(request);
    const tier = user?.tier || 'free';
    return tierLimits[tier].limit;
  },
  window: (request) => {
    const user = getUser(request);
    const tier = user?.tier || 'free';
    return tierLimits[tier].window;
  },
  keyGenerator: (request) => {
    const userId = getUserId(request);
    return `user:${userId}`;
  }
});
```

## Advanced Examples

### DDoS Protection

```js
const { RateLimiter, DDoSProtection } = require('edge-utils/rate-limiting');

// DDoS protection with multiple layers
const ddosProtection = new DDoSProtection({
  layers: [
    // Layer 1: Very strict IP-based limiting
    {
      name: 'ip-strict',
      limiter: new RateLimiter({
        limit: 10,
        window: 1000,  // 10 requests per second
        algorithm: 'fixed-window',
        keyGenerator: 'ip'
      }),
      action: 'block'
    },
    // Layer 2: User agent analysis
    {
      name: 'ua-analysis',
      limiter: new RateLimiter({
        limit: 5,
        window: 1000,
        keyGenerator: (request) => {
          const ua = request.headers.get('User-Agent');
          return isSuspiciousUA(ua) ? `suspicious:${getClientIP(request)}` : null;
        }
      }),
      action: 'challenge'
    },
    // Layer 3: Request pattern analysis
    {
      name: 'pattern-analysis',
      limiter: new RateLimiter({
        limit: 100,
        window: 60000,
        keyGenerator: (request) => {
          const pattern = analyzeRequestPattern(request);
          return pattern.isSuspicious ? `pattern:${getClientIP(request)}` : null;
        }
      }),
      action: 'throttle'
    }
  ]
});

// Apply DDoS protection
const protectedHandler = async (request) => {
  const protectionResult = await ddosProtection.check(request);

  if (protectionResult.blocked) {
    return new Response('Access denied', { status: 403 });
  }

  if (protectionResult.challenge) {
    return new Response('Complete challenge', {
      status: 429,
      headers: { 'X-Challenge-Required': 'true' }
    });
  }

  // Continue with normal processing
  return handler(request);
};
```

### API Gateway Rate Limiting

```js
const { RateLimiter, APIGatewayLimiter } = require('edge-utils/rate-limiting');

// API Gateway with comprehensive rate limiting
const apiGateway = new APIGatewayLimiter({
  globalLimits: {
    requestsPerSecond: 10000,
    requestsPerMinute: 500000,
    requestsPerHour: 10000000
  },
  serviceLimits: {
    'user-service': {
      requestsPerSecond: 1000,
      requestsPerMinute: 50000
    },
    'order-service': {
      requestsPerSecond: 500,
      requestsPerMinute: 25000
    }
  },
  userLimits: {
    anonymous: { requestsPerHour: 1000 },
    authenticated: { requestsPerHour: 10000 },
    premium: { requestsPerHour: 100000 }
  }
});

// Gateway handler
const gatewayHandler = async (request) => {
  // Check global limits
  const globalResult = await apiGateway.checkGlobal(request);
  if (!globalResult.allowed) {
    return createRateLimitResponse(globalResult);
  }

  // Check service limits
  const service = getServiceFromPath(request.url.pathname);
  const serviceResult = await apiGateway.checkService(service, request);
  if (!serviceResult.allowed) {
    return createRateLimitResponse(serviceResult);
  }

  // Check user limits
  const userTier = getUserTier(request);
  const userResult = await apiGateway.checkUser(userTier, request);
  if (!userResult.allowed) {
    return createRateLimitResponse(userResult);
  }

  // Route to service
  return routeToService(service, request);
};
```

### Adaptive Rate Limiting

```js
const { RateLimiter, AdaptiveLimiter } = require('edge-utils/rate-limiting');

// Adaptive rate limiting based on system load and response times
const adaptiveLimiter = new AdaptiveLimiter({
  baseLimit: 100,
  maxLimit: 1000,
  minLimit: 10,
  adjustmentInterval: 60000,  // Adjust every minute
  metrics: {
    cpuThreshold: 80,         // Reduce limits when CPU > 80%
    memoryThreshold: 85,      // Reduce limits when memory > 85%
    responseTimeThreshold: 1000, // Reduce limits when response time > 1s
    errorRateThreshold: 0.05  // Reduce limits when error rate > 5%
  },
  store: new RateLimitStore({ type: 'memory' })
});

// Monitor system metrics
setInterval(async () => {
  const metrics = await getSystemMetrics();
  await adaptiveLimiter.adjustLimits(metrics);
}, 30000); // Check every 30 seconds

// Use adaptive limiter
const handler = async (request) => {
  const result = await adaptiveLimiter.check(request);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  // Process request and track response time
  const startTime = Date.now();
  const response = await processRequest(request);
  const responseTime = Date.now() - startTime;

  // Report metrics back to adaptive limiter
  await adaptiveLimiter.reportMetrics({
    responseTime,
    success: response.ok
  });

  return response;
};
```

### Rate Limit Analytics

```js
const { RateLimiter, RateLimitAnalytics } = require('edge-utils/rate-limiting');

// Rate limiting with analytics
const analytics = new RateLimitAnalytics({
  store: new RateLimitStore({ type: 'kv', storage: kvStorage }),
  reporting: {
    enabled: true,
    interval: 300000,  // Report every 5 minutes
    webhook: 'https://analytics.example.com/webhook'
  }
});

const limiter = new RateLimiter({
  limit: 100,
  window: 60000,
  analytics: analytics
});

// Get analytics data
const analyticsHandler = async (request) => {
  if (request.url.endsWith('/rate-limit-analytics')) {
    const data = await analytics.getAnalytics({
      timeframe: '1h',  // Last hour
      groupBy: 'endpoint'
    });

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Apply rate limiting
  const result = await limiter.check(request);

  if (!result.allowed) {
    // Record violation
    await analytics.recordViolation(request, result);
    return createRateLimitResponse(result);
  }

  // Record successful request
  await analytics.recordRequest(request, result);

  return processRequest(request);
};
```

## Performance Optimization

### Caching Rate Limit Results

```js
// Cache rate limit checks for performance
const cachedLimiter = new RateLimiter({
  limit: 100,
  window: 60000,
  caching: {
    enabled: true,
    ttl: 1000,  // Cache results for 1 second
    storage: kvStorage
  }
});
```

### Batch Operations

```js
// Batch rate limit checks for multiple requests
const batchLimiter = new BatchRateLimiter({
  limit: 100,
  window: 60000,
  batchSize: 10  // Check 10 requests at once
});

const results = await batchLimiter.checkBatch(requests);
```

### Async Rate Limiting

```js
// Non-blocking rate limiting
const asyncLimiter = new RateLimiter({
  limit: 100,
  window: 60000,
  async: true,  // Don't block on storage operations
  queueSize: 1000  // Queue size for async operations
});
```

## Platform-Specific Notes

### Cloudflare Workers
- Use Cloudflare KV for distributed rate limiting
- Leverage Cloudflare's global network for consistency
- Compatible with Cloudflare Rate Limiting

### Vercel Edge Functions
- Use Vercel KV for distributed storage
- Compatible with Vercel's edge network
- Support for Vercel's deployment regions

### Deno Deploy
- Native support for distributed rate limiting
- Compatible with Deno KV for storage
- Support for Web APIs for rate limiting

## Best Practices

### Rate Limit Headers

Always include standard rate limit headers in responses:

```js
const response = new Response('Rate limit exceeded', { status: 429 });

// Standard headers
response.headers.set('X-RateLimit-Limit', limit.toString());
response.headers.set('X-RateLimit-Remaining', remaining.toString());
response.headers.set('X-RateLimit-Reset', resetTime.toString());

// Additional headers
response.headers.set('Retry-After', retryAfter.toString());
response.headers.set('X-RateLimit-Retry-After', retryAfter.toString());
```

### Graceful Degradation

Handle rate limit violations gracefully:

```js
const gracefulHandler = async (request) => {
  const result = await rateLimiter.check(request);

  if (!result.allowed) {
    // Check if this is a critical request
    if (isCriticalRequest(request)) {
      // Allow with reduced priority
      await queueForLaterProcessing(request);
      return new Response('Request queued for processing', { status: 202 });
    }

    // Return cached response if available
    const cached = await getCachedResponse(request);
    if (cached) {
      return cached;
    }

    // Return rate limit response
    return createRateLimitResponse(result);
  }

  return processRequest(request);
};
```

### Monitoring and Alerting

Monitor rate limiting effectiveness:

```js
// Monitor rate limit metrics
const monitor = new RateLimitMonitor({
  limiter,
  alerting: {
    enabled: true,
    thresholds: {
      violationRate: 0.1,  // Alert if > 10% requests are limited
      sustainedViolations: 100  // Alert if 100+ violations in 5 minutes
    },
    webhook: 'https://alerts.example.com/rate-limit'
  }
});

// Get monitoring data
const metrics = await monitor.getMetrics();
console.log({
  totalRequests: metrics.requests,
  limitedRequests: metrics.violations,
  violationRate: metrics.violationRate,
  topLimitedIPs: metrics.topLimitedIPs,
  topLimitedEndpoints: metrics.topLimitedEndpoints
});
```

## Testing

Run rate limiting tests with:

```bash
npm test -- --testPathPattern=rate-limiting.test.js
```

## API Reference

### RateLimiter Methods
- `check(request)` - Check if request is allowed
- `reset(key)` - Reset rate limit for a key
- `getRemaining(key)` - Get remaining requests for a key
- `getResetTime(key)` - Get reset time for a key

### RateLimitStore Methods
- `get(key)` - Get value for key
- `set(key, value, ttl)` - Set value with TTL
- `increment(key, amount)` - Increment value
- `delete(key)` - Delete key
- `cleanup()` - Clean up expired entries

### MultiTierRateLimiter Methods
- `check(request)` - Check all tiers
- `addTier(config)` - Add rate limiting tier
- `removeTier(name)` - Remove rate limiting tier
- `getTierStatus(name)` - Get status of specific tier

## Contributing

When contributing to rate limiting utilities:

1. Maintain backward compatibility
2. Add comprehensive tests for new algorithms
3. Update documentation for new features
4. Consider performance impact of changes
5. Test across all supported platforms

## License

MIT