---
title: "Monitoring Utils API"
description: "Complete API reference for monitoring and observability utilities"
---

# Monitoring Utils API Reference

The Monitoring Utils provide comprehensive monitoring, logging, and observability features for edge applications.

## MetricsCollector

Metrics collection and reporting.

### Constructor

```js
new MetricsCollector(options)
```

**Parameters:**
- `options` (object): Metrics configuration options

### Methods

#### counter(name, labels)

Create or get counter metric.

```js
const requests = metrics.counter('http_requests_total', { method: 'GET' });
requests.increment();
```

**Parameters:**
- `name` (string): Metric name
- `labels` (object, optional): Metric labels

**Returns:** Counter instance

#### gauge(name, labels)

Create or get gauge metric.

```js
const activeConnections = metrics.gauge('active_connections');
activeConnections.set(42);
```

**Parameters:**
- `name` (string): Metric name
- `labels` (object, optional): Metric labels

**Returns:** Gauge instance

#### histogram(name, labels)

Create or get histogram metric.

```js
const responseTime = metrics.histogram('http_request_duration');
responseTime.observe(0.5);
```

**Parameters:**
- `name` (string): Metric name
- `labels` (object, optional): Metric labels

**Returns:** Histogram instance

#### send(name, value, labels)

Send custom metric.

```js
await metrics.send('custom_metric', 123, { tag: 'value' });
```

**Parameters:**
- `name` (string): Metric name
- `value` (number): Metric value
- `labels` (object, optional): Metric labels

## StructuredLogger

Structured logging utilities.

### Constructor

```js
new StructuredLogger(options)
```

**Parameters:**
- `options` (object): Logger configuration options

### Methods

#### info(message, context)

Log info level message.

```js
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
```

**Parameters:**
- `message` (string): Log message
- `context` (object, optional): Additional context

#### error(message, error, context)

Log error level message.

```js
logger.error('Database connection failed', error, { query: 'SELECT * FROM users' });
```

**Parameters:**
- `message` (string): Log message
- `error` (Error, optional): Error object
- `context` (object, optional): Additional context

#### warn(message, context)

Log warning level message.

```js
logger.warn('Rate limit approaching', { remaining: 5 });
```

**Parameters:**
- `message` (string): Log message
- `context` (object, optional): Additional context

#### debug(message, context)

Log debug level message.

```js
logger.debug('Cache hit', { key: 'user:123', ttl: 300 });
```

**Parameters:**
- `message` (string): Log message
- `context` (object, optional): Additional context

## DistributedTracer

Distributed tracing utilities.

### Constructor

```js
new DistributedTracer(options)
```

**Parameters:**
- `options` (object): Tracing configuration options

### Methods

#### startSpan(name, parent)

Start a new trace span.

```js
const span = tracer.startSpan('http_request');
```

**Parameters:**
- `name` (string): Span name
- `parent` (Span, optional): Parent span

**Returns:** Span instance

#### inject(span, carrier)

Inject trace context into carrier.

```js
tracer.inject(span, headers);
```

**Parameters:**
- `span` (Span): Trace span
- `carrier` (object): Context carrier

#### extract(carrier)

Extract trace context from carrier.

```js
const spanContext = tracer.extract(headers);
```

**Parameters:**
- `carrier` (object): Context carrier

**Returns:** Span context

## HealthChecker

Application health checking.

### Constructor

```js
new HealthChecker(options)
```

**Parameters:**
- `options` (object): Health check configuration

### Methods

#### addCheck(name, checkFn)

Add health check.

```js
healthChecker.addCheck('database', async () => {
  await db.ping();
  return { status: 'healthy' };
});
```

**Parameters:**
- `name` (string): Check name
- `checkFn` (function): Health check function

#### runChecks()

Run all health checks.

```js
const results = await healthChecker.runChecks();
```

**Returns:** Promise resolving to health check results

#### getStatus()

Get overall health status.

```js
const status = healthChecker.getStatus();
```

**Returns:** Health status ('healthy', 'unhealthy', 'degraded')

## Type Definitions

### MetricOptions

```typescript
interface MetricOptions {
  endpoint?: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
}
```

### LogContext

```typescript
interface LogContext {
  [key: string]: any;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}
```

### Span

```typescript
interface Span {
  id: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, any>;
  finish(): void;
  setTag(key: string, value: any): void;
}
```

### HealthCheckResult

```typescript
interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}
```