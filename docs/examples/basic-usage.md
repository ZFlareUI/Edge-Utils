---
title: "Basic Usage Examples"
description: "Essential examples for getting started with Edge-Utils"
---

# Basic Usage Examples

Get started with Edge-Utils through practical examples across different platforms.

## GraphQL Client

### Basic Query

```js
import { GraphQLClient } from '@edge-utils/graphql';

const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  headers: {
    'Authorization': 'Bearer token'
  }
});

const query = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

const result = await client.query(query, { id: '123' });
console.log(result.data.user);
```

### Mutation with Variables

```js
const mutation = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
    }
  }
`;

const variables = {
  input: {
    name: 'John Doe',
    email: 'john@example.com'
  }
};

const result = await client.mutate(mutation, variables);
```

## Caching

### Memory Cache

```js
import { CacheManager, MemoryBackend } from '@edge-utils/cache';

const cache = new CacheManager({
  backend: new MemoryBackend(),
  ttl: 300000 // 5 minutes
});

// Cache a value
await cache.set('user:123', { name: 'John', email: 'john@example.com' });

// Retrieve cached value
const user = await cache.get('user:123');
```

### Edge Cache with TTL

```js
import { CacheManager, EdgeBackend } from '@edge-utils/cache';

const cache = new CacheManager({
  backend: new EdgeBackend(),
  strategies: ['cache-first']
});

// Cache with custom TTL
await cache.set('api-data', responseData, { ttl: 600000 }); // 10 minutes
```

## WebSocket Management

### Basic WebSocket Connection

```js
import { WebSocketManager } from '@edge-utils/websocket';

const wsManager = new WebSocketManager({
  url: 'wss://api.example.com/ws',
  protocols: ['chat']
});

// Connect and handle messages
await wsManager.connect();

wsManager.onMessage((data) => {
  console.log('Received:', data);
});

// Send message
wsManager.send({ type: 'chat', message: 'Hello!' });
```

### WebSocket Pool

```js
import { WebSocketPool } from '@edge-utils/websocket';

const pool = new WebSocketPool({
  urls: ['wss://server1.com', 'wss://server2.com'],
  maxConnections: 10
});

// Get connection from pool
const connection = await pool.getConnection();
connection.send({ event: 'subscribe', channel: 'updates' });
```

## Authentication

### JWT Token Generation

```js
import { AuthManager } from '@edge-utils/auth';

const auth = new AuthManager({
  secret: 'your-secret-key',
  algorithm: 'HS256'
});

// Generate token
const token = await auth.generateToken({
  userId: '123',
  role: 'user'
}, { expiresIn: '1h' });

// Verify token
const payload = await auth.verifyToken(token);
```

### Session Management

```js
// Create session
const sessionId = await auth.createSession({
  userId: '123',
  data: { preferences: { theme: 'dark' } }
}, { ttl: 3600000 }); // 1 hour

// Validate session
const session = await auth.validateSession(sessionId);
```

## Geographic Operations

### Location Detection

```js
import { LocationDetector } from '@edge-utils/geo';

const detector = new LocationDetector();

// Detect by IP
const location = await detector.detectByIP('192.168.1.1');
console.log(`Location: ${location.city}, ${location.country}`);

// Detect current location (browser)
const currentLocation = await detector.detect();
```

### Distance Calculation

```js
import { DistanceCalculator } from '@edge-utils/geo';

const calculator = new DistanceCalculator();

// Calculate distance between two points
const distance = calculator.haversine(
  { lat: 40.7128, lng: -74.0060 }, // New York
  { lat: 34.0522, lng: -118.2437 } // Los Angeles
);

console.log(`Distance: ${distance} km`);
```

## Performance Monitoring

### Cold Start Detection

```js
import { ColdStartDetector } from '@edge-utils/performance';

const coldStart = new ColdStartDetector();

if (coldStart.isColdStart()) {
  console.log('Cold start detected - warming up...');
  // Perform initialization logic
}
```

### Performance Monitoring

```js
import { PerformanceMonitor } from '@edge-utils/performance';

const monitor = new PerformanceMonitor();

// Time an operation
const timerId = monitor.start('api-call');
const result = await fetch('https://api.example.com/data');
monitor.end('api-call');

// Get duration
const duration = monitor.getDuration('api-call');
console.log(`API call took ${duration}ms`);
```

## Security Headers

### Basic Security Setup

```js
import { SecurityHeaders } from '@edge-utils/security';

const security = new SecurityHeaders();

// Apply security headers to response
const response = new Response('Hello World');
const secureResponse = security.apply(response, {
  contentSecurityPolicy: "default-src 'self'",
  hsts: { maxAge: 31536000 },
  noSniff: true
});
```

### CSRF Protection

```js
import { CSRFProtection } from '@edge-utils/security';

const csrf = new CSRFProtection({
  secret: 'csrf-secret'
});

// Generate token for form
const token = csrf.generateToken();

// Verify token in request
const isValid = csrf.verifyToken(request.headers.get('x-csrf-token'));
```

## Monitoring

### Metrics Collection

```js
import { MetricsCollector } from '@edge-utils/monitoring';

const metrics = new MetricsCollector();

// Counter metric
metrics.counter('requests_total', { method: 'GET', status: '200' });

// Gauge metric
metrics.gauge('active_connections', 42);

// Histogram metric
metrics.histogram('request_duration', 0.5, { endpoint: '/api/users' });
```

### Structured Logging

```js
import { StructuredLogger } from '@edge-utils/monitoring';

const logger = new StructuredLogger({
  level: 'info',
  format: 'json'
});

logger.info('User logged in', {
  userId: '123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

logger.error('Database connection failed', {
  error: 'Connection timeout',
  retryCount: 3
});
```