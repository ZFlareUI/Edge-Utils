---
title: "Advanced Patterns"
description: "Advanced usage patterns and best practices for Edge-Utils"
---

# Advanced Patterns

Explore advanced usage patterns and architectural best practices with Edge-Utils.

## Caching Strategies

### Multi-Level Caching

Combine multiple cache backends for optimal performance.

```js
import { CacheManager, MemoryBackend, EdgeBackend } from '@edge-utils/cache';

// L1: Fast memory cache
const l1Cache = new CacheManager({
  backend: new MemoryBackend(),
  ttl: 30000 // 30 seconds
});

// L2: Durable edge cache
const l2Cache = new CacheManager({
  backend: new EdgeBackend(),
  ttl: 300000 // 5 minutes
});

// Multi-level caching function
async function getWithMultiLevelCache(key) {
  // Try L1 first
  let data = await l1Cache.get(key);
  if (data) return data;

  // Try L2
  data = await l2Cache.get(key);
  if (data) {
    // Populate L1 for faster future access
    await l1Cache.set(key, data, { ttl: 30000 });
    return data;
  }

  // Fetch from source
  data = await fetchFromSource(key);

  // Cache in both levels
  await Promise.all([
    l1Cache.set(key, data, { ttl: 30000 }),
    l2Cache.set(key, data, { ttl: 300000 })
  ]);

  return data;
}
```

### Cache-Aside Pattern

Implement cache-aside pattern with automatic cache population.

```js
class CacheAsideService {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }

  async get(key, fetcher) {
    let data = await this.cache.get(key);
    if (!data) {
      data = await fetcher();
      await this.cache.set(key, data);
    }
    return data;
  }

  async invalidate(key) {
    await this.cache.delete(key);
  }
}

// Usage
const service = new CacheAsideService(cacheManager);

const user = await service.get(`user:${userId}`, async () => {
  return await database.getUser(userId);
});
```

## GraphQL Optimization

### Query Batching

Batch multiple GraphQL queries to reduce network overhead.

```js
import { GraphQLClient } from '@edge-utils/graphql';

class BatchedGraphQLClient extends GraphQLClient {
  constructor(options) {
    super(options);
    this.batchQueue = [];
    this.batchTimeout = null;
  }

  async query(query, variables, options = {}) {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ query, variables, resolve, reject });

      if (this.batchQueue.length >= 10) {
        this.flushBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.flushBatch(), 50);
      }
    });
  }

  async flushBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = this.batchQueue.splice(0);
    if (batch.length === 0) return;

    try {
      const results = await this.batchExecute(batch);
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }

  async batchExecute(queries) {
    // Implement batch execution logic
    const batchQuery = `
      query BatchQuery {
        ${queries.map((q, i) => `q${i}: ${q.query}`).join('\n')}
      }
    `;

    const result = await super.query(batchQuery);
    return queries.map((_, i) => result.data[`q${i}`]);
  }
}
```

### Schema Stitching

Combine multiple GraphQL schemas dynamically.

```js
import { GraphQLSchema, GraphQLQueryBuilder } from '@edge-utils/graphql';

class SchemaStitcher {
  constructor() {
    this.schemas = new Map();
  }

  addSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  async execute(query, variables = {}) {
    const builder = new GraphQLQueryBuilder();

    // Parse query and determine which schemas to use
    const requiredSchemas = this.analyzeQuery(query);

    // Execute against relevant schemas
    const results = await Promise.all(
      requiredSchemas.map(schemaName =>
        this.executeOnSchema(schemaName, query, variables)
      )
    );

    // Merge results
    return this.mergeResults(results);
  }

  analyzeQuery(query) {
    // Analyze query to determine required schemas
    // This is a simplified example
    return ['users', 'posts'];
  }

  async executeOnSchema(schemaName, query, variables) {
    const schema = this.schemas.get(schemaName);
    return await schema.execute(query, variables);
  }

  mergeResults(results) {
    // Implement result merging logic
    return results.reduce((merged, result) => ({
      ...merged,
      ...result
    }), {});
  }
}
```

## WebSocket Patterns

### Connection Pooling

Implement connection pooling for WebSocket connections.

```js
import { WebSocketPool } from '@edge-utils/websocket';

class SmartWebSocketPool extends WebSocketPool {
  constructor(options) {
    super(options);
    this.healthChecks = new Map();
    this.startHealthMonitoring();
  }

  async getHealthyConnection() {
    const connections = Array.from(this.connections.values());
    const healthyConnections = connections.filter(conn =>
      this.healthChecks.get(conn.id) !== false
    );

    if (healthyConnections.length > 0) {
      return healthyConnections[0];
    }

    // Create new connection if none healthy
    return await this.createConnection();
  }

  startHealthMonitoring() {
    setInterval(async () => {
      for (const [id, connection] of this.connections) {
        try {
          await this.pingConnection(connection);
          this.healthChecks.set(id, true);
        } catch (error) {
          this.healthChecks.set(id, false);
          console.warn(`Connection ${id} is unhealthy`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async pingConnection(connection) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Ping timeout')), 5000);

      connection.addEventListener('message', function handler(event) {
        if (event.data === 'pong') {
          clearTimeout(timeout);
          connection.removeEventListener('message', handler);
          resolve();
        }
      });

      connection.send('ping');
    });
  }
}
```

### Message Routing

Implement message routing for complex WebSocket architectures.

```js
import { WebSocketManager } from '@edge-utils/websocket';

class MessageRouter {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.routes = new Map();
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
  }

  route(pattern, handler) {
    this.routes.set(pattern, handler);
  }

  async handleMessage(message, connection) {
    // Apply middlewares
    let processedMessage = message;
    for (const middleware of this.middlewares) {
      processedMessage = await middleware(processedMessage, connection);
      if (!processedMessage) return; // Middleware can stop processing
    }

    // Route message
    for (const [pattern, handler] of this.routes) {
      if (this.matchesPattern(processedMessage, pattern)) {
        await handler(processedMessage, connection);
        break;
      }
    }
  }

  matchesPattern(message, pattern) {
    // Simple pattern matching - can be enhanced with regex
    return message.type === pattern.type;
  }
}

// Usage
const router = new MessageRouter(wsManager);

// Add middleware
router.use(async (message, connection) => {
  // Authentication middleware
  if (!message.token) {
    connection.send({ error: 'Unauthorized' });
    return null;
  }
  return message;
});

// Add routes
router.route({ type: 'chat' }, async (message, connection) => {
  // Handle chat messages
  await broadcastToRoom(message.roomId, message);
});

router.route({ type: 'subscribe' }, async (message, connection) => {
  // Handle subscriptions
  await subscribeToChannel(message.channelId, connection);
});
```

## Authentication Patterns

### Multi-Factor Authentication

Implement MFA with multiple verification methods.

```js
import { AuthManager } from '@edge-utils/auth';

class MFAAuthManager extends AuthManager {
  constructor(options) {
    super(options);
    this.mfaMethods = new Map();
  }

  registerMFAMethod(userId, method, config) {
    if (!this.mfaMethods.has(userId)) {
      this.mfaMethods.set(userId, []);
    }
    this.mfaMethods.get(userId).push({ method, config });
  }

  async authenticateWithMFA(credentials, mfaToken) {
    // Primary authentication
    const user = await this.authenticate(credentials);

    // MFA verification
    const mfaMethods = this.mfaMethods.get(user.id) || [];
    let mfaVerified = false;

    for (const { method, config } of mfaMethods) {
      try {
        const verified = await this.verifyMFAMethod(method, config, mfaToken);
        if (verified) {
          mfaVerified = true;
          break;
        }
      } catch (error) {
        console.warn(`MFA method ${method} failed:`, error);
      }
    }

    if (!mfaVerified && mfaMethods.length > 0) {
      throw new Error('MFA verification required');
    }

    return user;
  }

  async verifyMFAMethod(method, config, token) {
    switch (method) {
      case 'totp':
        return await this.verifyTOTP(config.secret, token);
      case 'sms':
        return await this.verifySMS(config.phoneNumber, token);
      case 'email':
        return await this.verifyEmail(config.email, token);
      default:
        throw new Error(`Unknown MFA method: ${method}`);
    }
  }
}
```

### Role-Based Access Control

Implement RBAC with hierarchical permissions.

```js
class RBACManager {
  constructor() {
    this.roles = new Map();
    this.userRoles = new Map();
    this.permissions = new Map();
  }

  defineRole(roleName, permissions) {
    this.roles.set(roleName, permissions);
  }

  assignRole(userId, roleName) {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }
    this.userRoles.get(userId).add(roleName);
  }

  hasPermission(userId, permission) {
    const userRoles = this.userRoles.get(userId) || new Set();

    for (const roleName of userRoles) {
      const rolePermissions = this.roles.get(roleName) || [];
      if (rolePermissions.includes(permission)) {
        return true;
      }

      // Check for wildcard permissions
      if (rolePermissions.some(p => p.endsWith('*') &&
        permission.startsWith(p.slice(0, -1)))) {
        return true;
      }
    }

    return false;
  }

  async authorize(userId, action, resource) {
    const permission = `${action}:${resource}`;

    if (!this.hasPermission(userId, permission)) {
      throw new Error(`Access denied: ${permission}`);
    }
  }
}

// Usage
const rbac = new RBACManager();

// Define roles
rbac.defineRole('admin', ['*']);
rbac.defineRole('user', ['read:profile', 'write:profile', 'read:posts']);
rbac.defineRole('moderator', ['read:*', 'write:posts', 'delete:posts']);

// Assign roles
rbac.assignRole('user123', 'user');

// Check permissions
await rbac.authorize('user123', 'write', 'profile'); // OK
await rbac.authorize('user123', 'delete', 'posts'); // Throws error
```

## Performance Optimization

### Response Streaming

Implement efficient response streaming for large datasets.

```js
import { StreamingResponse } from '@edge-utils/performance';

class StreamingDataProcessor {
  constructor() {
    this.stream = new StreamingResponse();
  }

  async processLargeDataset(dataset) {
    this.stream.write('['); // Start JSON array

    let first = true;
    for await (const item of dataset) {
      if (!first) this.stream.write(',');
      first = false;

      const processedItem = await this.processItem(item);
      this.stream.write(JSON.stringify(processedItem));

      // Yield control to prevent blocking
      await new Promise(resolve => setImmediate(resolve));
    }

    this.stream.write(']'); // End JSON array
    this.stream.end();

    return this.stream;
  }

  async processItem(item) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      ...item,
      processed: true,
      timestamp: Date.now()
    };
  }
}
```

### Memory Management

Implement memory-efficient processing for large datasets.

```js
import { ResourceMonitor } from '@edge-utils/performance';

class MemoryEfficientProcessor {
  constructor() {
    this.monitor = new ResourceMonitor();
    this.chunkSize = 1000;
  }

  async processLargeArray(array, processor) {
    const results = [];
    const chunks = this.chunkArray(array, this.chunkSize);

    for (const chunk of chunks) {
      // Check memory usage before processing
      const usage = this.monitor.getCurrentUsage();
      if (usage.memory > 0.8 * this.getMemoryLimit()) {
        await this.forceGarbageCollection();
      }

      const processedChunk = await Promise.all(
        chunk.map(item => processor(item))
      );

      results.push(...processedChunk);

      // Yield control and allow GC
      await new Promise(resolve => setImmediate(resolve));
    }

    return results;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  getMemoryLimit() {
    // Platform-specific memory limits
    return 128 * 1024 * 1024; // 128MB
  }

  async forceGarbageCollection() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}
```