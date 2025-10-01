# Monitoring & Observability

The monitoring utilities provide comprehensive observability features specifically designed for edge environments, including metrics collection, structured logging, distributed tracing, and health checks.

## Features

- Metrics Collection: Performance metrics, custom counters, histograms
- Structured Logging: JSON-formatted logs with redaction and filtering
- Distributed Tracing: Request tracing across edge functions and services
- Health Checks: Automated health monitoring and reporting
- Performance Monitoring: Response times, throughput, error rates
- Log Aggregation: Centralized log collection and analysis
- Edge Optimized: Low-overhead monitoring for edge environments
- Real-time Dashboards: Live metrics and alerting

## Quick Start

```js
const { MetricsCollector, StructuredLogger, TracingManager, HealthCheckManager } = require('edge-utils/monitoring');

// Metrics collection
const metrics = new MetricsCollector({ storage: kvStorage });
metrics.increment('requests_total', 1, { method: 'GET', status: '200' });
metrics.histogram('request_duration', 150, { endpoint: '/api/users' });

// Structured logging
const logger = new StructuredLogger({
  level: 'info',
  format: 'json',
  redaction: ['password', 'apiKey']
});
logger.info('User login successful', { userId: 123, ip: '192.168.1.1' });

// Distributed tracing
const tracer = new TracingManager({
  serviceName: 'edge-api',
  sampler: () => Math.random() < 0.1 // 10% sampling
});
const span = tracer.startSpan('handle_request');

// Health checks
const health = new HealthCheckManager();
health.addCheck('database', async () => {
  const isHealthy = await checkDatabase();
  return { healthy: isHealthy, latency: 5 };
});
```

## MetricsCollector

Comprehensive metrics collection with support for counters, gauges, histograms, and summaries.

### Constructor Options

```js
const metrics = new MetricsCollector({
  storage: kvStorage,                   // Optional distributed storage
  prefix: 'edge_',                      // Metric name prefix
  labels: {                            // Global labels
    service: 'edge-api',
    version: '1.0.0',
    region: 'us-east'
  },
  flushInterval: 60000,                // Flush interval in ms (1 minute)
  retention: 7 * 24 * 60 * 60 * 1000,   // Data retention (7 days)
  compression: true,                   // Enable data compression
  aggregation: {                       // Metric aggregation settings
    interval: 60000,                   // Aggregation interval
    functions: ['sum', 'avg', 'min', 'max', 'count']
  }
});
```

### Counter Metrics

```js
// Increment counter
metrics.increment('requests_total', 1, {
  method: 'GET',
  status: '200',
  endpoint: '/api/users'
});

// Increment by custom amount
metrics.increment('bytes_transferred', 1024, {
  direction: 'upload',
  user: 'user123'
});

// Get counter value
const requestCount = await metrics.getCounter('requests_total', {
  method: 'GET',
  status: '200'
});
```

### Gauge Metrics

```js
// Set gauge value
metrics.gauge('active_connections', 42, {
  region: 'us-east',
  instance: 'worker-1'
});

// Update gauge (add/subtract)
metrics.gauge('memory_usage', -50, { type: 'heap' });  // Decrease by 50
metrics.gauge('cpu_usage', 85, { core: '0' });        // Set to 85%

// Get gauge value
const connections = await metrics.getGauge('active_connections');
```

### Histogram Metrics

```js
// Record histogram observation
metrics.histogram('request_duration', 150.5, {
  method: 'POST',
  endpoint: '/api/users',
  status: '200'
});

metrics.histogram('response_size', 2048, {
  contentType: 'application/json'
});

// Get histogram statistics
const stats = await metrics.getHistogram('request_duration', {
  method: 'POST'
});
console.log({
  count: stats.count,
  sum: stats.sum,
  mean: stats.mean,
  median: stats.median,
  p95: stats.p95,
  p99: stats.p99,
  min: stats.min,
  max: stats.max
});
```

### Summary Metrics

```js
// Record summary observation
metrics.summary('api_latency', 250, {
  service: 'user-service',
  operation: 'getUser'
});

// Get summary quantiles
const quantiles = await metrics.getSummary('api_latency', {
  service: 'user-service'
});
console.log({
  '0.5': quantiles.quantile_0_5,   // Median
  '0.9': quantiles.quantile_0_9,   // P90
  '0.95': quantiles.quantile_0_95, // P95
  '0.99': quantiles.quantile_0_99  // P99
});
```

### Custom Metrics

```js
// Define custom metric
metrics.defineMetric('custom_metric', 'histogram', {
  description: 'Custom business metric',
  unit: 'requests',
  buckets: [10, 50, 100, 500, 1000]
});

// Record custom metric
metrics.record('custom_metric', 75, {
  business_unit: 'sales',
  region: 'na'
});
```

## StructuredLogger

JSON-formatted logging with redaction, filtering, and multiple output destinations.

### Constructor Options

```js
const logger = new StructuredLogger({
  level: 'info',                       // Log level (error, warn, info, debug)
  format: 'json',                      // Output format (json, text, pretty)
  redaction: ['password', 'apiKey', 'token', 'secret'], // Fields to redact
  filtering: {                         // Log filtering rules
    exclude: ['debug'],                // Exclude debug logs in production
    include: ['error', 'warn']         // Always include errors and warnings
  },
  destinations: [                      // Multiple output destinations
    { type: 'console' },
    { type: 'kv', storage: kvStorage, key: 'logs' },
    { type: 'http', url: 'https://logs.example.com/api/logs' }
  ],
  context: {                          // Global context
    service: 'edge-api',
    version: '1.0.0',
    environment: 'production'
  },
  buffering: {                        // Log buffering for performance
    enabled: true,
    size: 100,                        // Buffer size
    flushInterval: 5000               // Flush interval in ms
  }
});
```

### Logging Methods

```js
// Different log levels
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  userId: 123
});

logger.warn('Rate limit approaching', {
  current: 95,
  limit: 100,
  userId: 456
});

logger.info('User login successful', {
  userId: 123,
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

logger.debug('Processing request', {
  requestId: 'req-123',
  params: { id: 123, type: 'user' }
});
```

### Context and Correlation

```js
// Add request context
const requestLogger = logger.child({
  requestId: 'req-123',
  userId: 456,
  sessionId: 'sess-789'
});

// All logs will include the context
requestLogger.info('Processing payment');
requestLogger.debug('Validating card', { cardType: 'visa' });
requestLogger.error('Payment failed', { error: 'insufficient_funds' });
```

### Log Redaction

```js
// Sensitive data is automatically redacted
logger.info('User registration', {
  username: 'john_doe',
  password: 'secret123',        // Will be logged as "[REDACTED]"
  email: 'john@example.com',
  apiKey: 'sk-1234567890'       // Will be logged as "[REDACTED]"
});

// Custom redaction patterns
const customLogger = new StructuredLogger({
  redaction: {
    patterns: [
      /token_[a-zA-Z0-9]+/,     // Redact tokens
      /\b\d{4}-\d{4}-\d{4}-\d{4}\b/  // Redact credit cards
    ],
    replacement: '[SENSITIVE]'
  }
});
```

### Log Filtering

```js
// Filter logs based on conditions
const filteredLogger = new StructuredLogger({
  filtering: {
    include: (log) => log.level === 'error' || log.userId === 'admin',
    exclude: (log) => log.endpoint === '/health',
    sampling: {
      rate: 0.1,  // Sample 10% of debug logs
      levels: ['debug']
    }
  }
});
```

## TracingManager

Distributed tracing with span creation, context propagation, and sampling.

### Constructor Options

```js
const tracer = new TracingManager({
  serviceName: 'edge-api',             // Service name
  serviceVersion: '1.0.0',             // Service version
  sampler: (context) => {              // Sampling function
    // Sample 10% of requests
    return Math.random() < 0.1;
  },
  exporter: {                         // Trace export configuration
    type: 'http',
    url: 'https://tracing.example.com/api/traces',
    headers: { 'Authorization': 'Bearer token' }
  },
  propagation: {                      // Context propagation
    formats: ['w3c', 'b3'],           // Supported formats
    extract: true,                    // Extract context from requests
    inject: true                      // Inject context into requests
  },
  storage: kvStorage                  // Optional distributed storage
});
```

### Span Creation

```js
// Start root span
const rootSpan = tracer.startSpan('handle_request', {
  attributes: {
    'http.method': 'GET',
    'http.url': '/api/users',
    'user.id': 123
  }
});

// Create child spans
const dbSpan = tracer.startSpan('database_query', {
  parent: rootSpan,
  attributes: {
    'db.statement': 'SELECT * FROM users',
    'db.table': 'users'
  }
});

// Add events to spans
tracer.addEvent(rootSpan.spanId, 'request_started');
tracer.addEvent(dbSpan.spanId, 'query_executed', {
  rowCount: 42
});

// Set span attributes
tracer.setAttributes(rootSpan.spanId, {
  'http.status_code': 200,
  'response.size': 2048
});

// End spans
tracer.endSpan(dbSpan.spanId);
tracer.endSpan(rootSpan.spanId);
```

### Context Propagation

```js
// Extract context from incoming request
const extractedContext = tracer.extract(request.headers);

// Start span with extracted context
const span = tracer.startSpan('process_request', {
  parentContext: extractedContext
});

// Inject context into outgoing request
const headers = {};
tracer.inject(span.spanId, headers);

// Make request with trace context
const response = await fetch('https://api.example.com', {
  headers: {
    ...headers,
    'Content-Type': 'application/json'
  }
});
```

### Sampling Strategies

```js
// Probabilistic sampling
const probabilisticSampler = (context) => Math.random() < 0.1; // 10%

// Rate-limited sampling
let sampleCount = 0;
const rateLimitedSampler = (context) => {
  sampleCount++;
  return sampleCount % 10 === 0; // Sample every 10th request
};

// Dynamic sampling based on attributes
const dynamicSampler = (context) => {
  if (context.attributes['http.status_code'] >= 500) {
    return true; // Always sample errors
  }
  if (context.attributes['user.tier'] === 'premium') {
    return Math.random() < 0.5; // 50% for premium users
  }
  return Math.random() < 0.05; // 5% for regular users
};

const tracer = new TracingManager({
  serviceName: 'edge-api',
  sampler: dynamicSampler
});
```

## HealthCheckManager

Automated health monitoring with configurable checks and reporting.

### Constructor Options

```js
const health = new HealthCheckManager({
  timeout: 5000,                      // Check timeout in ms
  interval: 30000,                    // Check interval in ms
  retries: 2,                         // Number of retries on failure
  failureThreshold: 3,                // Failures before marking unhealthy
  successThreshold: 2,                // Successes before marking healthy
  storage: kvStorage,                 // Optional distributed storage
  alerting: {                         // Alert configuration
    enabled: true,
    webhook: 'https://alerts.example.com/webhook',
    thresholds: {
      responseTime: 1000,             // Alert if > 1s
      errorRate: 0.05                 // Alert if > 5% error rate
    }
  }
});
```

### Adding Health Checks

```js
// Database health check
health.addCheck('database', async () => {
  try {
    const startTime = Date.now();
    await database.ping();
    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
      details: { connectionPoolSize: 10 }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latency: 0
    };
  }
});

// External API health check
health.addCheck('external-api', async () => {
  const response = await fetch('https://api.example.com/health');
  const isHealthy = response.ok;

  return {
    healthy: isHealthy,
    latency: 0,  // Could measure response time
    statusCode: response.status
  };
});

// Cache health check
health.addCheck('cache', async () => {
  try {
    await cache.set('health-check', 'ok', { ttl: 10 });
    const value = await cache.get('health-check');

    return {
      healthy: value === 'ok',
      latency: 0
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
});
```

### Health Check Execution

```js
// Run all health checks
const results = await health.runChecks();
console.log(results);
// Output:
// {
//   database: { healthy: true, latency: 5, timestamp: 1234567890 },
//   'external-api': { healthy: true, latency: 150, timestamp: 1234567890 },
//   cache: { healthy: true, latency: 2, timestamp: 1234567890 }
// }

// Run specific check
const dbResult = await health.runCheck('database');

// Get overall health status
const overallHealth = health.getOverallHealth();
console.log(overallHealth);
// Output: { healthy: true, checks: 3, healthyChecks: 3, unhealthyChecks: 0 }
```

### Health Endpoints

```js
// Create health endpoint
const healthEndpoint = async (request) => {
  if (request.url.endsWith('/health')) {
    const results = await health.runChecks();
    const overall = health.getOverallHealth();

    const status = overall.healthy ? 200 : 503;

    return new Response(JSON.stringify({
      status: overall.healthy ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      checks: results,
      summary: {
        total: overall.checks,
        healthy: overall.healthyChecks,
        unhealthy: overall.unhealthyChecks
      }
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.url.endsWith('/health/live')) {
    // Liveness probe - just check if service is running
    return new Response('OK', { status: 200 });
  }

  if (request.url.endsWith('/health/ready')) {
    // Readiness probe - check if service is ready to serve traffic
    const overall = health.getOverallHealth();
    const status = overall.healthy ? 200 : 503;
    return new Response(overall.healthy ? 'Ready' : 'Not Ready', { status });
  }

  return new Response('Not found', { status: 404 });
};
```

## Middleware Integration

### Complete Monitoring Middleware

```js
const {
  MetricsCollector,
  StructuredLogger,
  TracingManager,
  HealthCheckManager
} = require('edge-utils/monitoring');

// Initialize monitoring components
const metrics = new MetricsCollector({
  labels: { service: 'edge-api', version: '1.0.0' }
});

const logger = new StructuredLogger({
  level: 'info',
  redaction: ['password', 'apiKey']
});

const tracer = new TracingManager({
  serviceName: 'edge-api',
  sampler: () => Math.random() < 0.1
});

const health = new HealthCheckManager();
health.addCheck('self', async () => ({ healthy: true, latency: 0 }));

// Monitoring middleware
const monitoringMiddleware = async (request, context) => {
  const startTime = Date.now();

  // Extract or create trace context
  const traceContext = tracer.extract(request.headers) || {};
  const rootSpan = tracer.startSpan('handle_request', {
    attributes: {
      'http.method': request.method,
      'http.url': request.url,
      'http.user_agent': request.headers.get('user-agent'),
      'http.scheme': new URL(request.url).protocol.replace(':', '')
    }
  });

  // Add trace context to request
  const traceHeaders = {};
  tracer.inject(rootSpan.spanId, traceHeaders);
  context.traceHeaders = traceHeaders;

  try {
    // Continue to next middleware
    const response = await context.next();

    const duration = Date.now() - startTime;

    // Record metrics
    metrics.increment('requests_total', 1, {
      method: request.method,
      status: response.status.toString(),
      endpoint: new URL(request.url).pathname
    });

    metrics.histogram('request_duration', duration, {
      method: request.method,
      status: response.status.toString()
    });

    // Log successful request
    logger.info('Request completed', {
      method: request.method,
      url: request.url,
      status: response.status,
      duration,
      userId: context.user?.id
    });

    // Add trace events
    tracer.addEvent(rootSpan.spanId, 'request_completed', {
      status: response.status,
      duration
    });

    // Set response headers
    tracer.setAttributes(rootSpan.spanId, {
      'http.status_code': response.status,
      'response.duration': duration
    });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;

    // Record error metrics
    metrics.increment('requests_total', 1, {
      method: request.method,
      status: '500',
      error: error.name
    });

    metrics.histogram('request_duration', duration, {
      method: request.method,
      status: '500'
    });

    // Log error
    logger.error('Request failed', {
      method: request.method,
      url: request.url,
      error: error.message,
      stack: error.stack,
      duration,
      userId: context.user?.id
    }, error);

    // Add trace error
    tracer.addEvent(rootSpan.spanId, 'request_failed', {
      error: error.message,
      stack: error.stack
    });

    throw error;

  } finally {
    // End trace span
    tracer.endSpan(rootSpan.spanId);
  }
};

// Error tracking middleware
const errorTrackingMiddleware = async (request, context) => {
  try {
    return await context.next();
  } catch (error) {
    // Track unhandled errors
    metrics.increment('errors_total', 1, {
      type: error.name,
      endpoint: new URL(request.url).pathname
    });

    throw error;
  }
};

// Performance monitoring middleware
const performanceMiddleware = async (request, context) => {
  const startTime = performance.now();
  const startMemory = performance.memory?.usedJSHeapSize;

  try {
    const response = await context.next();

    const endTime = performance.now();
    const endMemory = performance.memory?.usedJSHeapSize;

    // Record performance metrics
    if (endMemory && startMemory) {
      metrics.gauge('memory_usage', endMemory - startMemory, {
        type: 'delta'
      });
    }

    metrics.histogram('processing_time', endTime - startTime, {
      endpoint: new URL(request.url).pathname
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// Apply monitoring middleware
const monitoredHandler = applyMiddleware([
  monitoringMiddleware,
  errorTrackingMiddleware,
  performanceMiddleware
], baseHandler);
```

## Advanced Examples

### Real-time Metrics Dashboard

```js
const { MetricsCollector, StructuredLogger } = require('edge-utils/monitoring');

const metrics = new MetricsCollector({ storage: kvStorage });
const logger = new StructuredLogger({ level: 'info' });

// Metrics dashboard endpoint
const dashboardHandler = async (request) => {
  if (!request.url.includes('/metrics')) {
    return new Response('Not found', { status: 404 });
  }

  // Get current metrics
  const currentMetrics = await metrics.getAllMetrics();

  // Calculate derived metrics
  const derivedMetrics = {
    errorRate: currentMetrics.errors_total / currentMetrics.requests_total,
    averageResponseTime: currentMetrics.request_duration_sum / currentMetrics.request_duration_count,
    throughput: currentMetrics.requests_total / ((Date.now() - startTime) / 1000), // requests per second
    availability: (currentMetrics.requests_total - currentMetrics.errors_total) / currentMetrics.requests_total
  };

  // Get recent logs
  const recentLogs = await logger.getRecentLogs({
    limit: 100,
    since: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
  });

  // Generate dashboard HTML
  const html = generateDashboardHTML({
    metrics: { ...currentMetrics, ...derivedMetrics },
    logs: recentLogs,
    alerts: await getActiveAlerts()
  });

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
};
```

### Distributed Tracing Across Services

```js
const tracer = new TracingManager({
  serviceName: 'edge-gateway',
  exporter: { type: 'jaeger', endpoint: 'http://jaeger:14268/api/traces' }
});

// Gateway tracing middleware
const gatewayTracing = async (request, context) => {
  const span = tracer.startSpan('gateway_request', {
    attributes: {
      'http.method': request.method,
      'http.url': request.url,
      'gateway.service': 'edge-gateway'
    }
  });

  // Inject trace context
  const headers = { ...request.headers };
  tracer.inject(span.spanId, headers);

  // Forward request to backend
  const backendResponse = await fetch('https://backend.example.com', {
    method: request.method,
    headers,
    body: request.body
  });

  // Record backend call
  const backendSpan = tracer.startSpan('backend_call', {
    parent: span,
    attributes: {
      'http.status_code': backendResponse.status,
      'backend.service': 'user-service'
    }
  });

  tracer.endSpan(backendSpan.spanId);
  tracer.endSpan(span.spanId);

  return backendResponse;
};
```

### Health Check with Dependencies

```js
const health = new HealthCheckManager();

// Check database connectivity
health.addCheck('database', async () => {
  const client = new DatabaseClient();
  try {
    await client.connect();
    const result = await client.query('SELECT 1');
    await client.disconnect();

    return {
      healthy: result.length > 0,
      latency: client.getLastQueryTime(),
      details: {
        connectionTime: client.getConnectionTime(),
        queryTime: client.getLastQueryTime()
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      details: { errorCode: error.code }
    };
  }
});

// Check external service dependencies
health.addCheck('payment-service', async () => {
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.payment.com/health', {
      timeout: 3000
    });

    const latency = Date.now() - startTime;

    return {
      healthy: response.ok,
      latency,
      details: {
        statusCode: response.status,
        responseTime: latency
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latency: Date.now() - startTime
    };
  }
});

// Check cache availability
health.addCheck('cache', async () => {
  try {
    const testKey = `health-check-${Date.now()}`;
    await cache.set(testKey, 'ok', { ttl: 10 });
    const value = await cache.get(testKey);

    return {
      healthy: value === 'ok',
      latency: 0,
      details: { cacheType: cache.constructor.name }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
});
```

## Performance Considerations

### Metrics Collection Overhead

```js
// Use sampling for high-volume metrics
const sampledMetrics = new MetricsCollector({
  sampling: {
    enabled: true,
    rate: 0.1,  // Sample 10% of requests
    metrics: ['request_duration', 'response_size']
  }
});

// Batch metric updates
const batchMetrics = new MetricsCollector({
  batching: {
    enabled: true,
    size: 100,  // Batch 100 metrics before flushing
    interval: 5000  // Flush every 5 seconds
  }
});
```

### Log Performance

```js
// Asynchronous logging
const asyncLogger = new StructuredLogger({
  async: true,  // Don't block on log writes
  buffering: {
    enabled: true,
    size: 1000,
    flushInterval: 1000
  }
});

// Log level filtering for performance
const productionLogger = new StructuredLogger({
  level: 'warn',  // Only log warnings and errors in production
  filtering: {
    exclude: ['debug']  // Never log debug messages
  }
});
```

### Tracing Overhead

```js
// Adaptive sampling based on load
const adaptiveTracer = new TracingManager({
  sampler: (context) => {
    const load = getCurrentLoad(); // 0-1 scale
    const baseRate = 0.1; // 10% base sampling

    // Reduce sampling under high load
    return Math.random() < (baseRate * (1 - load));
  }
});

// Lightweight tracing for edge environments
const lightweightTracer = new TracingManager({
  lightweight: true,  // Minimal span data
  noStackTraces: true, // Don't capture stack traces
  maxSpans: 10  // Limit spans per request
});
```

## Platform-Specific Notes

### Cloudflare Workers
- Use Cloudflare Analytics Engine for metrics
- Compatible with Cloudflare Logs for structured logging
- Leverage Cloudflare's distributed tracing

### Vercel Edge Functions
- Compatible with Vercel's analytics
- Use Vercel Log Drain for centralized logging
- Support for Vercel's performance monitoring

### Deno Deploy
- Native performance with Deno runtime
- Compatible with Deno KV for metrics storage
- Support for Web APIs for monitoring

## Best Practices

### Metrics Naming

```js
// Good metric names
const goodMetrics = {
  requests_total: 'Total number of requests',
  request_duration_seconds: 'Request duration in seconds',
  active_connections: 'Number of active connections',
  error_rate: 'Rate of errors per second'
};

// Avoid
const badMetrics = {
  req: 'Too vague',
  requestTimeMS: 'Inconsistent naming',
  errorsPerMin: 'Inconsistent units'
};
```

### Logging Levels

```js
// Appropriate use of log levels
logger.error('Database connection failed', { error: error.message });  // System errors
logger.warn('Rate limit exceeded', { userId: 123, limit: 100 });       // Warnings
logger.info('User logged in', { userId: 123, ip: '1.2.3.4' });         // Important events
logger.debug('Processing step completed', { step: 'validation' });     // Debug info
```

### Tracing Guidelines

```js
// Meaningful span names
const spans = {
  'handle_request': 'Overall request handling',
  'authenticate_user': 'User authentication',
  'validate_input': 'Input validation',
  'database_query': 'Database operation',
  'external_api_call': 'External service call'
};

// Useful span attributes
const attributes = {
  'http.method': 'GET',
  'http.status_code': 200,
  'db.statement': 'SELECT * FROM users',
  'user.id': 123,
  'error.message': 'Connection timeout'
};
```

## Testing

Run monitoring tests with:

```bash
npm test -- --testPathPattern=monitoring.test.js
```

## API Reference

### MetricsCollector Methods
- `increment(name, value, labels)` - Increment counter
- `gauge(name, value, labels)` - Set gauge value
- `histogram(name, value, labels)` - Record histogram observation
- `summary(name, value, labels)` - Record summary observation
- `getCounter(name, labels)` - Get counter value
- `getGauge(name, labels)` - Get gauge value
- `getHistogram(name, labels)` - Get histogram statistics
- `getSummary(name, labels)` - Get summary quantiles

### StructuredLogger Methods
- `error(message, meta, error)` - Log error message
- `warn(message, meta)` - Log warning message
- `info(message, meta)` - Log info message
- `debug(message, meta)` - Log debug message
- `child(meta)` - Create child logger with additional context

### TracingManager Methods
- `startSpan(name, options)` - Start new span
- `endSpan(spanId)` - End span
- `addEvent(spanId, name, attributes)` - Add event to span
- `setAttributes(spanId, attributes)` - Set span attributes
- `extract(headers)` - Extract trace context
- `inject(spanId, headers)` - Inject trace context

### HealthCheckManager Methods
- `addCheck(name, checkFn)` - Add health check
- `runChecks()` - Run all health checks
- `runCheck(name)` - Run specific health check
- `getOverallHealth()` - Get overall health status

## Contributing

When contributing to monitoring utilities:

1. Maintain observability best practices
2. Add comprehensive monitoring tests
3. Update documentation for monitoring features
4. Consider performance impact of monitoring
5. Test across all supported platforms

## License

MIT