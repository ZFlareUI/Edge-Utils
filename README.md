# edge-utils

Platform-agnostic utilities for enterprise edge computing and serverless environments with production-grade features for modern web applications.

## Introduction

Edge-utils is a comprehensive toolkit designed specifically for edge computing and serverless environments. It provides production-ready utilities that work seamlessly across multiple platforms including Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and traditional Node.js serverless functions.

### Key Benefits

- Platform Agnostic: Works across all major edge platforms without code changes
- High Performance: Optimized for edge runtimes with minimal cold start impact
- Production Ready: Enterprise-grade security, monitoring, and error handling
- Observable: Built-in metrics, logging, and distributed tracing
- Fault Tolerant: Circuit breakers, retries, and graceful degradation
- Global Scale: Geo-aware routing and load balancing
- Secure: Comprehensive security headers, CSRF protection, and DDoS mitigation
- Scalable: Connection pooling, rate limiting, and resource management

### Architecture

Edge-utils is built with a modular architecture where you can pick and choose the features you need:

- **Core**: Platform detection, error handling, and utility functions
- **Caching**: Memory and edge-native caching with TTL and invalidation
- **Authentication**: JWT, API keys, and session management
- **Security**: Headers, CSRF, XSS prevention, and DDoS protection
- **Rate Limiting**: Multiple algorithms with distributed storage support
- **Load Balancing**: Intelligent request distribution with health monitoring
- **Monitoring**: Metrics, structured logging, and distributed tracing
- **Geo**: Location-aware routing and region selection
- **Performance**: Cold start optimization and response streaming
- **GraphQL**: Client, schema validation, and middleware
- **WebSocket**: Real-time communication with connection management

### Use Cases

- **API Gateways**: Rate limiting, authentication, and request routing
- **CDNs**: Caching, compression, and geo-aware content delivery
- **Microservices**: Service discovery, load balancing, and circuit breaking
- **Real-time Apps**: WebSocket connections, broadcasting, and presence
- **Serverless Functions**: Cold start optimization and error handling
- **Edge Computing**: Global distribution and performance optimization

## Documentation

For detailed documentation on each module, see the following guides:

- **[GraphQL](docs/graphql.md)** - GraphQL client, schema validation, query building, and middleware
- **[Authentication](docs/auth.md)** - JWT tokens, API keys, session management, and authorization
- **[Caching](docs/caching.md)** - Memory and edge caching, cache warming, invalidation strategies
- **[Security](docs/security.md)** - Security headers, CSRF protection, XSS prevention, DDoS mitigation
- **[Monitoring](docs/monitoring.md)** - Metrics collection, structured logging, distributed tracing, health checks
- **[Load Balancing](docs/load-balancing.md)** - Intelligent request distribution, health monitoring, circuit breakers
- **[Rate Limiting](docs/rate-limiting.md)** - Multiple algorithms, key generators, distributed storage
- **[Content Negotiation](docs/content-negotiation.md)** - Response formatting, compression, validation
- **[WebSocket](docs/websocket.md)** - Real-time communication, connection management, broadcasting

## Quick Start
```js
const { createEdgeHandler, RateLimitManager, SecurityHeadersManager } = require('edge-utils');

const rateLimiter = new RateLimitManager();
rateLimiter.addStrategy('api', {
  type: 'token-bucket',
  refillRate: 100, // requests per second
  capacity: 1000
});

const securityHeaders = new SecurityHeadersManager({
  contentSecurityPolicy: { enabled: true },
  hsts: { maxAge: 31536000, includeSubDomains: true }
});

const handler = createEdgeHandler({
  rateLimiting: { strategy: 'api' },
  security: { headers: true },
  cache: { strategy: 'memory', ttl: 300 },
  geo: { routing: 'nearest', regions: ['us', 'eu', 'asia'] },
  cors: { origins: ['*'], methods: ['GET', 'POST'] }
});

module.exports = handler;
```

## Platform Compatibility Matrix
| Platform            | Supported | Notes |
|---------------------|-----------|-------|
| Cloudflare Workers  | Yes       | Full KV support, Durable Objects |
| Vercel Edge         | Yes       | Edge Config, KV support |
| Deno Deploy         | Yes       | Deno KV, native performance |
| AWS Lambda@Edge     | Yes       | Basic support |
| Fastly Compute@Edge | Yes       | Advanced caching |
| Node.js Serverless  | Yes       | Fallback mode |

## Core Features

### Rate Limiting System
Distributed rate limiting with multiple algorithms for protecting your APIs.

```js
const { RateLimitManager, TokenBucketLimiter } = require('edge-utils/rate-limiting');

// Token Bucket Algorithm
const limiter = new TokenBucketLimiter({
  refillRate: 10, // tokens per second
  capacity: 100,  // burst capacity
  storage: kvStorage // optional distributed storage
});

// Sliding Window Algorithm
const slidingLimiter = new SlidingWindowLimiter({
  windowSize: 60, // seconds
  maxRequests: 100,
  storage: kvStorage
});

// Rate Limit Manager with strategies
const rateLimiter = new RateLimitManager({ storage: kvStorage });
rateLimiter.addStrategy('api', {
  type: 'token-bucket',
  refillRate: 100,
  capacity: 1000
});

// Middleware usage
const middleware = rateLimiter.middleware({ strategy: 'api' });
```

### Advanced Security Module
Comprehensive security features including headers, CSRF protection, XSS prevention, and DDoS mitigation.

```js
const { SecurityHeadersManager, CSRFProtection, RequestValidator } = require('edge-utils/security');

// Security Headers
const headersManager = new SecurityHeadersManager({
  contentSecurityPolicy: {
    enabled: true,
    scriptSrc: "'self' 'nonce-abc123'"
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }
});

// CSRF Protection
const csrf = new CSRFProtection({
  secret: 'your-secret-key',
  cookieName: 'csrf-token'
});

// Request Validation with JSON Schema
const validator = new RequestValidator();
validator.addSchema('user', {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
});
```

### Authentication & Authorization
JWT tokens, API keys, and session management for edge environments.

```js
const { JWTManager, APIKeyManager, EdgeSessionManager } = require('edge-utils/auth');

// JWT Management
const jwt = new JWTManager({
  secret: 'your-secret',
  issuer: 'your-app',
  audience: 'your-users'
});

const token = jwt.generate({ userId: 123, role: 'admin' });
const verified = jwt.verify(token);

// API Key Management
const apiKeys = new APIKeyManager({
  hmacSecret: 'key-secret',
  storage: kvStorage
});

const key = apiKeys.generate({
  permissions: ['read', 'write'],
  quota: { limit: 1000, period: 'hour' }
});

// Session Management
const sessions = new EdgeSessionManager({
  secret: 'session-secret',
  storage: kvStorage,
  ttl: 24 * 60 * 60 * 1000 // 24 hours
});

const sessionId = await sessions.create({ userId: 123 }, 'user-123');
```

### Monitoring & Observability
Metrics collection, structured logging, distributed tracing, and health checks.

```js
const { MetricsCollector, StructuredLogger, TracingManager, HealthCheckManager } = require('edge-utils/monitoring');

// Metrics Collection
const metrics = new MetricsCollector({ storage: kvStorage });
metrics.increment('requests_total', 1, { method: 'GET', status: '200' });
metrics.histogram('request_duration', 150, { endpoint: '/api/users' });
metrics.gauge('active_connections', 42);

// Structured Logging
const logger = new StructuredLogger({
  level: 'info',
  format: 'json',
  redaction: ['password', 'apiKey']
});

logger.info('User login successful', {
  userId: 123,
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// Distributed Tracing
const tracer = new TracingManager({
  serviceName: 'edge-api',
  sampler: () => Math.random() < 0.1 // 10% sampling
});

const span = tracer.startSpan('handle_request');
tracer.addEvent(span.spanId, 'processing_started');
tracer.endSpan(span.spanId);

// Health Checks
const health = new HealthCheckManager();
health.addCheck('database', async () => {
  // Check database connection
  return { healthy: true, latency: 5 };
});

health.addCheck('external_api', async () => {
  // Check external service
  return true;
});
```

### Load Balancing & Fault Tolerance
Intelligent request distribution with health monitoring, circuit breakers, and sticky sessions for high availability.

```js
const { LoadBalancer, CircuitBreaker, StickySessionManager } = require('edge-utils/load-balancing');

// Load Balancer with multiple algorithms
const loadBalancer = new LoadBalancer({
  algorithm: 'round-robin', // round-robin, weighted-round-robin, least-connections, random, ip-hash, alter
  endpoints: [
    { url: 'https://api1.example.com', weight: 2 },
    { url: 'https://api2.example.com', weight: 1 },
    { url: 'https://api3.example.com', weight: 1 }
  ],
  healthCheckInterval: 30000, // Check every 30 seconds
  failureThreshold: 3, // Mark unhealthy after 3 failures
  timeout: 5000 // 5 second timeout
});

// Get next endpoint
const endpoint = loadBalancer.getNextEndpoint();

// Record request metrics
loadBalancer.recordRequestStart(endpoint);
loadBalancer.recordRequestEnd(endpoint, 150, true); // 150ms response time, success

// Get load balancer stats
const stats = loadBalancer.getStats();
console.log(`Healthy endpoints: ${stats.healthyEndpoints}/${stats.totalEndpoints}`);

// Circuit Breaker for fault tolerance
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  recoveryTimeout: 60000 // Try to close after 1 minute
});

const apiCall = async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
};

try {
  const result = await circuitBreaker.execute(apiCall);
  console.log('Success:', result);
} catch (error) {
  console.log('Circuit breaker open or operation failed:', error.message);
}

// Sticky Session Manager for session affinity
const stickyManager = new StickySessionManager({
  ttl: 30 * 60 * 1000, // 30 minutes
  storage: kvStorage // Optional distributed storage
});

const endpoints = ['server1', 'server2', 'server3'];
const clientId = 'user-123';

// Get consistent endpoint for client
const stickyEndpoint = stickyManager.getStickyEndpoint(clientId, endpoints);

// Clean up expired sessions
stickyManager.cleanup();
```

### ALTER Algorithm
The ALTER (Adaptive Load balancing with Enhanced Response Time) algorithm is a custom intelligent load balancing strategy that considers multiple performance factors:

- **Response Time**: Prioritizes endpoints with faster average response times
- **Current Load**: Considers active request count to avoid overloaded servers
- **Error Rate**: Factors in recent failure rates for reliability
- **Randomization**: Adds small randomization to prevent thundering herd problems

```js
// Using the ALTER algorithm for optimal performance
const loadBalancer = new LoadBalancer({
  algorithm: 'alter', // Custom intelligent algorithm
  endpoints: [
    { url: 'https://api1.example.com', weight: 1 },
    { url: 'https://api2.example.com', weight: 1 },
    { url: 'https://api3.example.com', weight: 1 }
  ]
});

// The algorithm automatically selects the best endpoint based on real-time metrics
const endpoint = loadBalancer.getNextEndpoint();
```

## API Documentation

### Core
- `createEdgeHandler(options)` - Universal handler creator with all features
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

### Load Balancing
- `LoadBalancer` - Intelligent request distribution with health monitoring
- `CircuitBreaker` - Fault tolerance with automatic recovery
- `StickySessionManager` - Session affinity for stateful applications

## Advanced Usage Examples

### Complete Edge API with All Features
```js
const {
  createEdgeHandler,
  RateLimitManager,
  SecurityHeadersManager,
  JWTManager,
  MetricsCollector,
  StructuredLogger
} = require('edge-utils');

// Initialize components
const rateLimiter = new RateLimitManager();
rateLimiter.addStrategy('api', {
  type: 'token-bucket',
  refillRate: 100,
  capacity: 1000
});

const securityHeaders = new SecurityHeadersManager({
  contentSecurityPolicy: { enabled: true },
  hsts: { maxAge: 31536000, includeSubDomains: true }
});

const jwtManager = new JWTManager({
  secret: process.env.JWT_SECRET,
  issuer: 'my-app'
});

const metrics = new MetricsCollector();
const logger = new StructuredLogger({ level: 'info' });

// Create handler with all features
const handler = createEdgeHandler({
  rateLimiting: { strategy: 'api' },
  security: { headers: true },
  auth: { required: true },
  monitoring: { metrics: true, logging: true },
  cache: { strategy: 'edge', ttl: 300 },
  cors: { origins: ['https://myapp.com'], credentials: true }
});

// Custom middleware
handler.use(async (request, context) => {
  const startTime = Date.now();

  // Authentication
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verified = jwtManager.verify(token);
    if (verified.valid) {
      context.user = verified.payload;
    }
  }

  // Metrics
  metrics.increment('requests_total', 1, {
    method: request.method,
    path: new URL(request.url).pathname
  });

  // Logging
  logger.info('Request received', {
    method: request.method,
    url: request.url,
    userId: context.user?.userId
  });

  // Continue to next middleware
  const response = await context.next();

  // Record response metrics
  metrics.timing('request_duration', startTime, {
    method: request.method,
    status: response.status
  });

  // Add security headers
  const secureHeaders = securityHeaders.generate();
  for (const [key, value] of Object.entries(secureHeaders)) {
    response.headers.set(key, value);
  }

  return response;
});

module.exports = handler;
```

### Rate Limiting with Different Strategies
```js
const { RateLimitManager } = require('edge-utils/rate-limiting');

const rateLimiter = new RateLimitManager({ storage: kvStorage });

// Per-user rate limiting
rateLimiter.addStrategy('per_user', {
  type: 'token-bucket',
  refillRate: 10, // 10 requests per second per user
  capacity: 50
});

// API endpoint rate limiting
rateLimiter.addStrategy('api_endpoint', {
  type: 'sliding-window',
  windowSize: 60, // 1 minute window
  maxRequests: 100 // 100 requests per minute
});

// Global rate limiting
rateLimiter.addStrategy('global', {
  type: 'token-bucket',
  refillRate: 1000, // 1000 requests per second globally
  capacity: 5000
});

// Middleware with conditional rate limiting
const middleware = (options = {}) => async (request, context) => {
  let strategy = 'global';

  if (context.user) {
    strategy = 'per_user';
  } else if (request.url.includes('/api/')) {
    strategy = 'api_endpoint';
  }

  const result = await rateLimiter.check(request, {
    strategy,
    by: context.user ? 'user' : 'ip'
  });

  if (!result.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Retry-After': result.resetTime.toString(),
        ...result.headers
      }
    });
  }

  context.rateLimitHeaders = result.headers;
  return null;
};
```

### Security Implementation
```js
const {
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator,
  DDoSProtection
} = require('edge-utils/security');

// Initialize security components
const headersManager = new SecurityHeadersManager({
  contentSecurityPolicy: {
    enabled: true,
    defaultSrc: "'self'",
    scriptSrc: "'self' 'unsafe-inline'",
    styleSrc: "'self' 'unsafe-inline' https://fonts.googleapis.com",
    fontSrc: "'self' https://fonts.gstatic.com",
    imgSrc: "'self' data: https:",
    connectSrc: "'self' https://api.example.com"
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameOptions: { action: 'DENY' },
  contentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    geolocation: 'none',
    camera: 'none',
    microphone: 'none'
  }
});

const csrfProtection = new CSRFProtection({
  secret: process.env.CSRF_SECRET,
  sameSite: 'strict'
});

const xssPrevention = new XSSPrevention({
  sanitizationRules: [
    {
      context: 'html',
      pattern: /<script[^>]*>.*?<\/script>/gi,
      replacement: ''
    }
  ]
});

const requestValidator = new RequestValidator({
  ajvOptions: { allErrors: true, removeAdditional: true }
});

// Add validation schemas
requestValidator.addSchema('createUser', {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 }
  },
  required: ['name', 'email', 'password']
});

const ddosProtection = new DDoSProtection({
  spikeThreshold: 100, // requests per minute
  blockDuration: 15 * 60 * 1000, // 15 minutes
  challengeEnabled: true
});

// Security middleware chain
const securityMiddleware = [
  ddosProtection.middleware(),
  csrfProtection.middleware(),
  async (request, context) => {
    // Input validation
    if (request.method === 'POST' && request.url.includes('/api/users')) {
      const validation = requestValidator.validate(request, 'createUser');
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // XSS prevention
    if (request.body && typeof request.body === 'string') {
      request.body = xssPrevention.sanitize(request.body);
    }

    return null;
  }
];
```

### Load Balancing Implementation
```js
const { LoadBalancer, CircuitBreaker, StickySessionManager } = require('edge-utils/load-balancing');

// Initialize load balancer with health monitoring
const loadBalancer = new LoadBalancer({
  algorithm: 'weighted-round-robin',
  endpoints: [
    { url: 'https://api-us-east.example.com', weight: 3 },
    { url: 'https://api-us-west.example.com', weight: 2 },
    { url: 'https://api-eu-west.example.com', weight: 2 }
  ],
  healthCheckInterval: 15000, // Check every 15 seconds
  failureThreshold: 2,
  successThreshold: 2,
  timeout: 3000
});

// Circuit breaker for API calls
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000,
  monitoringPeriod: 60000
});

// Sticky sessions for user-specific data
const stickyManager = new StickySessionManager({
  ttl: 60 * 60 * 1000, // 1 hour
  storage: kvStorage
});

// Load balancing middleware
const loadBalancingMiddleware = async (request, context) => {
  const clientId = context.user?.id || getClientIP(request);

  // Get sticky endpoint for session affinity
  const endpoints = Array.from(loadBalancer.endpoints.keys());
  const targetEndpoint = stickyManager.getStickyEndpoint(clientId, endpoints);

  if (!targetEndpoint) {
    return new Response('No healthy endpoints available', { status: 503 });
  }

  // Execute request with circuit breaker
  try {
    const result = await circuitBreaker.execute(async () => {
      loadBalancer.recordRequestStart(targetEndpoint);

      const startTime = Date.now();
      const response = await fetch(`${targetEndpoint}${new URL(request.url).pathname}`, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

      const responseTime = Date.now() - startTime;
      loadBalancer.recordRequestEnd(targetEndpoint, responseTime, response.ok);

      return response;
    });

    return result;
  } catch (error) {
    // Record failed request
    loadBalancer.recordRequestEnd(targetEndpoint, 0, false);

    return new Response('Service temporarily unavailable', { status: 503 });
  }
};

// Health check endpoint
const healthMiddleware = async (request, context) => {
  if (request.url.endsWith('/health')) {
    const stats = loadBalancer.getStats();
    const circuitStats = circuitBreaker.getStats();

    return new Response(JSON.stringify({
      loadBalancer: {
        healthy: stats.healthyEndpoints > 0,
        totalEndpoints: stats.totalEndpoints,
        healthyEndpoints: stats.healthyEndpoints
      },
      circuitBreaker: {
        state: circuitStats.state,
        failureRate: circuitStats.failureRate
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
};
```

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
- Bundle size: < 100KB gzipped (with all features)
- Cold start: < 50ms on edge runtimes
- Memory usage: Minimal footprint
- Request processing: < 10ms overhead per feature

## Contributing
PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Code of Conduct
Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

## Security
See [SECURITY.md](./SECURITY.md) for security-related information.

## License
MIT