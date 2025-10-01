# Load Balancing & Traffic Management

The load balancing utilities provide intelligent traffic distribution, failover handling, and performance optimization for edge environments. These utilities help distribute requests across multiple backend services, handle failures gracefully, and optimize response times.

## Features

- Multiple Algorithms: Round-robin, least connections, weighted, IP hash
- Health Monitoring: Automatic backend health checks and failover
- Load Metrics: Real-time load monitoring and adaptive balancing
- Geographic Routing: Location-based traffic routing
- Performance Optimization: Response time-based load balancing
- Session Affinity: Sticky sessions and connection persistence
- Auto-scaling: Dynamic backend pool management
- Circuit Breaker: Fault tolerance and graceful degradation

## Quick Start

```js
const { LoadBalancer, BackendPool, HealthChecker } = require('edge-utils/load-balancing');

// Create backend pool
const backends = [
  { id: 'server-1', url: 'https://api1.example.com', weight: 1 },
  { id: 'server-2', url: 'https://api2.example.com', weight: 2 },
  { id: 'server-3', url: 'https://api3.example.com', weight: 1 }
];

const pool = new BackendPool(backends);

// Configure load balancer
const loadBalancer = new LoadBalancer({
  algorithm: 'weighted-round-robin',
  pool,
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
    unhealthyThreshold: 3,
    healthyThreshold: 2
  }
});

// Use in request handler
const handler = async (request) => {
  const backend = await loadBalancer.selectBackend(request);
  const response = await fetch(`${backend.url}${new URL(request.url).pathname}`, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  return response;
};
```

## Load Balancing Algorithms

### Round Robin

Distributes requests sequentially across all healthy backends.

```js
const loadBalancer = new LoadBalancer({
  algorithm: 'round-robin',
  pool: new BackendPool(backends)
});

// Requests: server-1, server-2, server-3, server-1, server-2...
```

### Weighted Round Robin

Distributes requests based on backend weights.

```js
const weightedBackends = [
  { id: 'server-1', url: 'https://api1.example.com', weight: 1 }, // 20%
  { id: 'server-2', url: 'https://api2.example.com', weight: 3 }, // 60%
  { id: 'server-3', url: 'https://api3.example.com', weight: 1 }  // 20%
];

const loadBalancer = new LoadBalancer({
  algorithm: 'weighted-round-robin',
  pool: new BackendPool(weightedBackends)
});

// Requests: server-1, server-2, server-2, server-2, server-3, server-1...
```

### Least Connections

Routes to the backend with the fewest active connections.

```js
const loadBalancer = new LoadBalancer({
  algorithm: 'least-connections',
  pool: new BackendPool(backends),
  connectionTracking: true
});

// Tracks active connections per backend
// Routes to backend with lowest connection count
```

### IP Hash

Routes requests from the same IP to the same backend (session affinity).

```js
const loadBalancer = new LoadBalancer({
  algorithm: 'ip-hash',
  pool: new BackendPool(backends)
});

// Same IP always goes to same backend
// Useful for session-based applications
```

### Least Response Time

Routes to the backend with the fastest recent response times.

```js
const loadBalancer = new LoadBalancer({
  algorithm: 'least-response-time',
  pool: new BackendPool(backends),
  responseTimeWindow: 60000, // 1 minute window
  responseTimeSamples: 10    // Keep 10 samples per backend
});

// Routes based on average response time over last minute
```

### Random

Randomly selects a healthy backend.

```js
const loadBalancer = new LoadBalancer({
  algorithm: 'random',
  pool: new BackendPool(backends)
});

// Useful for simple load distribution
```

## BackendPool

Manages the collection of backend servers with health status and metadata.

### Constructor Options

```js
const pool = new BackendPool(backends, {
  maxConnections: 100,                // Max connections per backend
  connectionTimeout: 30000,           // Connection timeout in ms
  retryPolicy: {                      // Retry configuration
    maxRetries: 3,
    backoff: 'exponential',
    baseDelay: 1000
  },
  circuitBreaker: {                   // Circuit breaker settings
    failureThreshold: 5,              // Failures before opening
    recoveryTimeout: 60000,           // Time before attempting recovery
    monitoringPeriod: 10000           // Monitoring window
  }
});
```

### Backend Configuration

```js
const backends = [
  {
    id: 'api-server-1',
    url: 'https://api1.example.com',
    weight: 2,                        // Load balancing weight
    maxConnections: 50,               // Max concurrent connections
    metadata: {                       // Custom metadata
      region: 'us-east',
      capacity: 'high',
      version: '2.1.0'
    },
    healthCheck: {                    // Backend-specific health check
      path: '/health',
      interval: 15000,
      timeout: 3000
    }
  },
  {
    id: 'api-server-2',
    url: 'https://api2.example.com',
    weight: 1,
    disabled: false,                  // Can disable backend
    backup: false                     // Mark as backup server
  }
];
```

### Dynamic Backend Management

```js
const pool = new BackendPool(initialBackends);

// Add backend dynamically
pool.addBackend({
  id: 'new-server',
  url: 'https://new.example.com',
  weight: 1
});

// Update backend configuration
pool.updateBackend('server-1', {
  weight: 3,
  metadata: { region: 'us-west' }
});

// Remove backend
pool.removeBackend('old-server');

// Get backend information
const backend = pool.getBackend('server-1');
const healthyBackends = pool.getHealthyBackends();
const allBackends = pool.getAllBackends();
```

## Health Monitoring

Automatic health checks and failure detection for backend servers.

### Health Check Configuration

```js
const healthChecker = new HealthChecker({
  interval: 30000,                    // Check every 30 seconds
  timeout: 5000,                      // 5 second timeout
  unhealthyThreshold: 3,              // 3 failures = unhealthy
  healthyThreshold: 2,                // 2 successes = healthy
  path: '/health',                    // Health check endpoint
  method: 'GET',                      // HTTP method
  expectedStatus: [200, 201],         // Expected status codes
  expectedBody: '{"status":"ok"}',    // Expected response body
  headers: {                          // Custom headers
    'User-Agent': 'LoadBalancer-HealthCheck/1.0'
  }
});

// Attach to load balancer
const loadBalancer = new LoadBalancer({
  pool,
  healthCheck: healthChecker
});
```

### Custom Health Checks

```js
// Custom health check function
const customHealthCheck = async (backend) => {
  try {
    const startTime = Date.now();

    // Custom health logic
    const response = await fetch(`${backend.url}/custom-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check: 'database' })
    });

    const latency = Date.now() - startTime;
    const data = await response.json();

    return {
      healthy: response.ok && data.database === 'connected',
      latency,
      details: {
        databaseStatus: data.database,
        cacheStatus: data.cache,
        responseTime: latency
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latency: 0
    };
  }
};

const healthChecker = new HealthChecker({
  customCheck: customHealthCheck
});
```

### Health Status Monitoring

```js
// Get health status of all backends
const healthStatus = healthChecker.getHealthStatus();
console.log(healthStatus);
// Output:
// {
//   'server-1': {
//     healthy: true,
//     lastCheck: 1234567890,
//     consecutiveSuccesses: 5,
//     consecutiveFailures: 0,
//     averageLatency: 45,
//     lastError: null
//   },
//   'server-2': {
//     healthy: false,
//     lastCheck: 1234567891,
//     consecutiveSuccesses: 0,
//     consecutiveFailures: 3,
//     averageLatency: 0,
//     lastError: 'Connection timeout'
//   }
// }

// Listen for health changes
healthChecker.on('backend-healthy', (backendId) => {
  console.log(`Backend ${backendId} is now healthy`);
});

healthChecker.on('backend-unhealthy', (backendId, error) => {
  console.log(`Backend ${backendId} is unhealthy: ${error}`);
});
```

## Circuit Breaker Pattern

Prevents cascading failures by temporarily stopping requests to failing backends.

### Circuit Breaker Configuration

```js
const loadBalancer = new LoadBalancer({
  pool,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,              // Open after 5 failures
    recoveryTimeout: 60000,           // Try again after 1 minute
    monitoringPeriod: 10000,          // Monitor last 10 seconds
    successThreshold: 3,              // Close after 3 successes
    fallbackResponse: {               // Response when circuit is open
      status: 503,
      body: 'Service temporarily unavailable',
      headers: { 'Retry-After': '60' }
    }
  }
});
```

### Circuit Breaker States

```js
// Circuit breaker states
const states = {
  CLOSED: 'normal operation, requests pass through',
  OPEN: 'circuit is open, requests fail fast',
  HALF_OPEN: 'testing if backend recovered'
};

// Manual circuit breaker control
const circuitBreaker = loadBalancer.getCircuitBreaker();

// Force open circuit for maintenance
circuitBreaker.open();

// Force close circuit
circuitBreaker.close();

// Check circuit state
const state = circuitBreaker.getState();
console.log(`Circuit breaker is ${state}`);
```

## Session Affinity

Maintains session persistence by routing related requests to the same backend.

### Sticky Sessions

```js
const loadBalancer = new LoadBalancer({
  algorithm: 'ip-hash',  // Or 'least-connections' with session tracking
  sessionAffinity: {
    enabled: true,
    type: 'ip-hash',     // ip-hash, cookie, header
    cookieName: 'LB_SESSION',
    headerName: 'X-Session-ID',
    ttl: 3600000         // 1 hour session TTL
  }
});

// Cookie-based affinity
const cookieAffinity = {
  type: 'cookie',
  cookieName: 'lb_session',
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600
  }
};

// Header-based affinity
const headerAffinity = {
  type: 'header',
  headerName: 'X-User-ID'
};
```

### Session Management

```js
// Get session information
const sessionManager = loadBalancer.getSessionManager();

// Get backend for session
const backend = sessionManager.getBackendForSession('session-123');

// Clear session affinity
sessionManager.clearSession('session-123');

// Get session statistics
const stats = sessionManager.getSessionStats();
console.log({
  activeSessions: stats.active,
  totalSessions: stats.total,
  averageSessionDuration: stats.avgDuration
});
```

## Geographic Load Balancing

Routes traffic based on geographic location for improved performance.

### Geo-based Routing

```js
const geoBalancer = new LoadBalancer({
  algorithm: 'geo-based',
  geoConfig: {
    enabled: true,
    fallbackRegion: 'us-east',
    regions: {
      'us-east': ['server-1', 'server-2'],
      'us-west': ['server-3', 'server-4'],
      'eu-west': ['server-5', 'server-6']
    }
  }
});

// Geographic detection
const geoDetector = new GeoDetector({
  database: 'maxmind',  // or 'ipapi', 'ipinfo'
  cache: kvStorage
});

// Route based on client location
const handler = async (request) => {
  const clientIP = getClientIP(request);
  const location = await geoDetector.detectLocation(clientIP);

  const backend = await geoBalancer.selectBackend(request, {
    location: {
      country: location.country,
      region: location.region,
      city: location.city
    }
  });

  return proxyToBackend(backend, request);
};
```

## Performance Optimization

### Connection Pooling

```js
const loadBalancer = new LoadBalancer({
  pool,
  connectionPooling: {
    enabled: true,
    maxConnections: 100,              // Max connections per backend
    maxIdleTime: 30000,               // Close idle connections after 30s
    keepAlive: true,                  // Keep connections alive
    keepAliveTimeout: 60000           // Keep alive timeout
  }
});
```

### Request Queuing

```js
const loadBalancer = new LoadBalancer({
  pool,
  queuing: {
    enabled: true,
    maxQueueSize: 1000,               // Max queued requests
    queueTimeout: 30000,              // Timeout for queued requests
    priorityQueue: true,              // Enable priority queuing
    priorityLevels: ['high', 'normal', 'low']
  }
});

// Queue request with priority
const response = await loadBalancer.queueRequest(request, {
  priority: 'high',
  timeout: 10000
});
```

### Load Shedding

```js
const loadBalancer = new LoadBalancer({
  pool,
  loadShedding: {
    enabled: true,
    cpuThreshold: 80,                 // Shed load when CPU > 80%
    memoryThreshold: 85,              // Shed load when memory > 85%
    queueThreshold: 500,              // Shed when queue > 500
    shedResponse: {
      status: 503,
      body: 'Service overloaded, please try again later',
      headers: { 'Retry-After': '30' }
    }
  }
});
```

## Advanced Examples

### Multi-region Load Balancing

```js
const { LoadBalancer, BackendPool, GeoDetector } = require('edge-utils/load-balancing');

// Define regional backends
const regionalBackends = {
  'us-east': [
    { id: 'us-east-1', url: 'https://us-east-1.example.com', weight: 2 },
    { id: 'us-east-2', url: 'https://us-east-2.example.com', weight: 1 }
  ],
  'us-west': [
    { id: 'us-west-1', url: 'https://us-west-1.example.com', weight: 1 },
    { id: 'us-west-2', url: 'https://us-west-2.example.com', weight: 2 }
  ],
  'eu-west': [
    { id: 'eu-west-1', url: 'https://eu-west-1.example.com', weight: 1 }
  ]
};

// Create regional load balancers
const regionalBalancers = {};
for (const [region, backends] of Object.entries(regionalBackends)) {
  const pool = new BackendPool(backends);
  regionalBalancers[region] = new LoadBalancer({
    algorithm: 'weighted-round-robin',
    pool,
    healthCheck: { enabled: true }
  });
}

// Global load balancer with geo routing
const globalBalancer = new LoadBalancer({
  algorithm: 'geo-aware',
  regionalBalancers,
  geoDetector: new GeoDetector(),
  fallbackRegion: 'us-east'
});

// Global handler
const globalHandler = async (request) => {
  const backend = await globalBalancer.selectBackend(request);
  return proxyRequest(backend, request);
};
```

### API Gateway with Load Balancing

```js
const { LoadBalancer, BackendPool, RateLimiter } = require('edge-utils/load-balancing');
const { RateLimiter } = require('edge-utils/rate-limiting');

// Create service backends
const services = {
  'user-service': new BackendPool([
    { id: 'user-1', url: 'https://user1.example.com' },
    { id: 'user-2', url: 'https://user2.example.com' }
  ]),
  'order-service': new BackendPool([
    { id: 'order-1', url: 'https://order1.example.com' },
    { id: 'order-2', url: 'https://order2.example.com' }
  ])
};

// Create service load balancers
const serviceBalancers = {};
for (const [service, pool] of Object.entries(services)) {
  serviceBalancers[service] = new LoadBalancer({
    algorithm: 'least-connections',
    pool,
    healthCheck: { enabled: true }
  });
}

// Rate limiting per service
const rateLimiters = {
  'user-service': new RateLimiter({ limit: 100, window: 60000 }),
  'order-service': new RateLimiter({ limit: 50, window: 60000 })
};

// API Gateway handler
const apiGateway = async (request) => {
  const url = new URL(request.url);
  const service = getServiceFromPath(url.pathname); // e.g., '/api/users' -> 'user-service'

  if (!serviceBalancers[service]) {
    return new Response('Service not found', { status: 404 });
  }

  // Apply rate limiting
  const rateLimiter = rateLimiters[service];
  const allowed = await rateLimiter.check(request);
  if (!allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }

  // Route to service
  const balancer = serviceBalancers[service];
  const backend = await balancer.selectBackend(request);

  // Add routing headers
  const headers = new Headers(request.headers);
  headers.set('X-Service', service);
  headers.set('X-Backend', backend.id);

  // Proxy request
  const response = await fetch(`${backend.url}${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: request.body
  });

  // Add response headers
  response.headers.set('X-Load-Balanced', 'true');
  response.headers.set('X-Backend-Response-Time', response.headers.get('X-Response-Time'));

  return response;
};
```

### Auto-scaling Integration

```js
const { LoadBalancer, BackendPool, AutoScaler } = require('edge-utils/load-balancing');

// Auto-scaling configuration
const autoScaler = new AutoScaler({
  minInstances: 2,
  maxInstances: 10,
  scaleUpThreshold: 70,    // Scale up when CPU > 70%
  scaleDownThreshold: 30,  // Scale down when CPU < 30%
  cooldownPeriod: 300000,  // 5 minutes between scaling actions
  metricsWindow: 300000    // Consider last 5 minutes of metrics
});

// Backend pool with auto-scaling
const scalablePool = new BackendPool([], {
  autoScaler,
  instanceTemplate: {
    url: 'https://api-{id}.example.com',
    weight: 1,
    metadata: { autoScaled: true }
  }
});

// Load balancer with auto-scaling
const loadBalancer = new LoadBalancer({
  algorithm: 'least-connections',
  pool: scalablePool,
  healthCheck: { enabled: true }
});

// Monitor and scale
setInterval(async () => {
  const metrics = await loadBalancer.getMetrics();
  await autoScaler.evaluate(metrics);
}, 60000); // Check every minute
```

### Blue-Green Deployment

```js
const { LoadBalancer, BackendPool } = require('edge-utils/load-balancing');

// Blue environment
const bluePool = new BackendPool([
  { id: 'blue-1', url: 'https://blue1.example.com', weight: 1 },
  { id: 'blue-2', url: 'https://blue2.example.com', weight: 1 }
]);

// Green environment
const greenPool = new BackendPool([
  { id: 'green-1', url: 'https://green1.example.com', weight: 1 },
  { id: 'green-2', url: 'https://green2.example.com', weight: 1 }
]);

// Blue-green load balancer
class BlueGreenBalancer {
  constructor(bluePool, greenPool) {
    this.blueBalancer = new LoadBalancer({
      algorithm: 'round-robin',
      pool: bluePool
    });
    this.greenBalancer = new LoadBalancer({
      algorithm: 'round-robin',
      pool: greenPool
    });
    this.activeEnvironment = 'blue'; // or 'green'
    this.trafficDistribution = { blue: 100, green: 0 }; // Percentage
  }

  async selectBackend(request) {
    const rand = Math.random() * 100;
    const blueTraffic = this.trafficDistribution.blue;

    if (rand < blueTraffic) {
      return this.blueBalancer.selectBackend(request);
    } else {
      return this.greenBalancer.selectBackend(request);
    }
  }

  // Switch to green environment
  async switchToGreen() {
    // Gradual traffic shift
    this.trafficDistribution = { blue: 0, green: 100 };
    this.activeEnvironment = 'green';
  }

  // Canary deployment (10% traffic to green)
  async canaryDeploy(percentage = 10) {
    this.trafficDistribution = {
      blue: 100 - percentage,
      green: percentage
    };
  }
}

const bgBalancer = new BlueGreenBalancer(bluePool, greenPool);

// Deployment handler
const deploymentHandler = async (request) => {
  const backend = await bgBalancer.selectBackend(request);
  return proxyToBackend(backend, request);
};
```

## Middleware Integration

### Load Balancing Middleware

```js
const { LoadBalancer, BackendPool } = require('edge-utils/load-balancing');

// Create load balancer
const backends = [
  { id: 'api-1', url: 'https://api1.example.com' },
  { id: 'api-2', url: 'https://api2.example.com' },
  { id: 'api-3', url: 'https://api3.example.com' }
];

const pool = new BackendPool(backends);
const loadBalancer = new LoadBalancer({
  algorithm: 'least-connections',
  pool,
  healthCheck: { enabled: true }
});

// Load balancing middleware
const loadBalancingMiddleware = async (request, context) => {
  // Skip load balancing for static assets
  if (request.url.includes('/static/') || request.url.includes('/assets/')) {
    return context.next();
  }

  // Select backend
  const backend = await loadBalancer.selectBackend(request);

  // Add backend info to context
  context.backend = backend;

  // Continue to next middleware
  const response = await context.next();

  // Add load balancing headers
  response.headers.set('X-Backend-Server', backend.id);
  response.headers.set('X-Load-Balanced', 'true');

  return response;
};

// Backend proxy middleware
const backendProxyMiddleware = async (request, context) => {
  if (!context.backend) {
    return context.next();
  }

  const backend = context.backend;
  const url = new URL(request.url);

  // Build backend URL
  const backendUrl = `${backend.url}${url.pathname}${url.search}`;

  // Proxy request to backend
  const response = await fetch(backendUrl, {
    method: request.method,
    headers: {
      ...request.headers,
      'X-Forwarded-Host': url.host,
      'X-Forwarded-Proto': url.protocol.replace(':', ''),
      'X-Real-IP': getClientIP(request)
    },
    body: request.body
  });

  return response;
};

// Apply middleware
const handler = applyMiddleware([
  loadBalancingMiddleware,
  backendProxyMiddleware
], baseHandler);
```

## Performance Considerations

### Connection Optimization

```js
// Connection pooling for better performance
const optimizedBalancer = new LoadBalancer({
  pool,
  connectionPooling: {
    enabled: true,
    maxConnections: 50,
    keepAlive: true,
    keepAliveTimeout: 60000,
    maxIdleTime: 30000
  }
});
```

### Caching Backend Selection

```js
// Cache backend selection for session affinity
const cachedBalancer = new LoadBalancer({
  pool,
  caching: {
    enabled: true,
    ttl: 300000,  // Cache for 5 minutes
    storage: kvStorage
  }
});
```

### Async Backend Selection

```js
// Non-blocking backend selection
const asyncBalancer = new LoadBalancer({
  pool,
  asyncSelection: true,  // Don't block on health checks
  selectionTimeout: 100  // Max time for selection
});
```

## Platform-Specific Notes

### Cloudflare Workers
- Use Durable Objects for session affinity
- Leverage Cloudflare's global network for geo-routing
- Compatible with Cloudflare Load Balancing

### Vercel Edge Functions
- Use Vercel's edge network for geographic routing
- Compatible with Vercel KV for backend state
- Support for Vercel's deployment regions

### Deno Deploy
- Native HTTP/2 support for connection pooling
- Compatible with Deno KV for distributed state
- Support for Web APIs for load balancing

## Best Practices

### Backend Configuration

```js
// Recommended backend configuration
const recommendedBackends = [
  {
    id: 'backend-1',
    url: 'https://api1.example.com',
    weight: 1,
    maxConnections: 100,
    healthCheck: {
      path: '/health',
      interval: 30000,
      timeout: 5000
    }
  }
];
```

### Health Check Best Practices

```js
// Comprehensive health check
const healthCheck = {
  path: '/health',
  method: 'GET',
  interval: 30000,
  timeout: 5000,
  expectedStatus: [200],
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'LoadBalancer-HealthCheck/1.0'
  }
};
```

### Monitoring and Alerting

```js
// Monitor load balancer metrics
const metrics = loadBalancer.getMetrics();
console.log({
  totalRequests: metrics.requests,
  healthyBackends: metrics.healthyBackends,
  unhealthyBackends: metrics.unhealthyBackends,
  averageResponseTime: metrics.avgResponseTime
});

// Set up alerting
if (metrics.unhealthyBackends > 0) {
  await sendAlert('Unhealthy backends detected', {
    unhealthyCount: metrics.unhealthyBackends,
    totalBackends: metrics.totalBackends
  });
}
```

## Testing

Run load balancing tests with:

```bash
npm test -- --testPathPattern=load-balancing.test.js
```

## API Reference

### LoadBalancer Methods
- `selectBackend(request, options)` - Select backend for request
- `getMetrics()` - Get load balancer metrics
- `getHealthStatus()` - Get health status of backends
- `addBackend(backend)` - Add backend dynamically
- `removeBackend(backendId)` - Remove backend
- `updateBackend(backendId, config)` - Update backend configuration

### BackendPool Methods
- `addBackend(backend)` - Add backend to pool
- `removeBackend(backendId)` - Remove backend from pool
- `updateBackend(backendId, config)` - Update backend configuration
- `getBackend(backendId)` - Get backend by ID
- `getHealthyBackends()` - Get all healthy backends
- `getAllBackends()` - Get all backends

### HealthChecker Methods
- `checkBackend(backend)` - Check specific backend health
- `checkAllBackends()` - Check all backends health
- `getHealthStatus()` - Get health status of all backends
- `on(event, callback)` - Listen for health events

## Contributing

When contributing to load balancing utilities:

1. Maintain backward compatibility
2. Add comprehensive tests for new algorithms
3. Update documentation for new features
4. Consider performance impact of changes
5. Test across all supported platforms

## License

MIT