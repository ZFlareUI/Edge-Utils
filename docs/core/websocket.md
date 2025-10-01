# WebSocket Utilities & Real-time Communication

The WebSocket utilities provide comprehensive real-time communication capabilities for edge environments. These utilities enable bidirectional communication, connection management, and scalable real-time features like chat, notifications, and live updates.

## Features

- WebSocket Management: Connection handling and lifecycle management
- Real-time Messaging: Bidirectional message passing with protocols
- Connection Pooling: Efficient connection management and scaling
- Authentication: Secure WebSocket connections with auth
- Monitoring: Connection metrics and health monitoring
- Load Balancing: Distribute WebSocket connections across instances
- Reconnection: Automatic reconnection with exponential backoff
- Scalability: Support for thousands of concurrent connections

## Quick Start

```js
const { WebSocketManager, WebSocketPool } = require('edge-utils/websocket');

// Create WebSocket manager
const wsManager = new WebSocketManager({
  maxConnections: 1000,
  heartbeatInterval: 30000,
  authentication: true
});

// Create connection pool
const pool = new WebSocketPool({
  maxConnections: 100,
  loadBalancing: 'round-robin'
});

// WebSocket handler
const wsHandler = async (request) => {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  // Accept WebSocket connection
  const { socket, response } = await wsManager.accept(request);

  // Handle connection
  socket.addEventListener('message', (event) => {
    console.log('Received:', event.data);

    // Echo message back
    socket.send(JSON.stringify({
      type: 'echo',
      data: event.data,
      timestamp: Date.now()
    }));
  });

  socket.addEventListener('close', () => {
    console.log('Connection closed');
  });

  return response;
};
```

## WebSocket Manager

### Connection Management

Handle WebSocket connections with automatic lifecycle management.

```js
const wsManager = new WebSocketManager({
  maxConnections: 1000,          // Maximum concurrent connections
  connectionTimeout: 30000,      // Connection timeout in ms
  heartbeatInterval: 30000,      // Heartbeat interval
  heartbeatTimeout: 10000,       // Heartbeat timeout
  authentication: {              // Authentication settings
    required: true,
    timeout: 5000,
    validator: validateToken
  },
  compression: {                 // Compression settings
    enabled: true,
    threshold: 1024             // Compress messages > 1KB
  },
  protocols: ['chat', 'notification', 'stream']  // Supported protocols
});

// Accept WebSocket connection
const { socket, response } = await wsManager.accept(request, {
  protocol: 'chat',              // Requested protocol
  extensions: ['permessage-deflate']  // WebSocket extensions
});

// Connection is now managed automatically
console.log(`Active connections: ${wsManager.getActiveConnections()}`);
```

### Authentication

Secure WebSocket connections with various authentication methods.

```js
// JWT-based authentication
const jwtAuth = {
  type: 'jwt',
  secret: 'your-secret-key',
  algorithm: 'HS256',
  issuer: 'your-app',
  audience: 'websocket'
};

// API key authentication
const apiKeyAuth = {
  type: 'api-key',
  header: 'X-API-Key',
  validator: async (apiKey) => {
    return await validateApiKey(apiKey);
  }
};

// Custom authentication
const customAuth = {
  type: 'custom',
  validator: async (request) => {
    const token = request.headers.get('Authorization');
    const user = await authenticateUser(token);

    if (!user) {
      throw new Error('Authentication failed');
    }

    return { userId: user.id, permissions: user.permissions };
  }
};

const wsManager = new WebSocketManager({
  authentication: customAuth
});

// Authenticated connections include user context
const { socket, response, user } = await wsManager.accept(request);
console.log(`User ${user.userId} connected`);
```

### Message Handling

Handle WebSocket messages with routing and middleware.

```js
const wsManager = new WebSocketManager();

// Message router
const messageRouter = {
  'chat:message': async (socket, data, context) => {
    // Handle chat message
    await broadcastToRoom(context.roomId, {
      type: 'chat:message',
      user: context.user.name,
      message: data.message,
      timestamp: Date.now()
    });
  },

  'room:join': async (socket, data, context) => {
    // Handle room join
    context.roomId = data.roomId;
    await joinRoom(socket, data.roomId);
    socket.send(JSON.stringify({
      type: 'room:joined',
      roomId: data.roomId
    }));
  },

  'ping': (socket, data) => {
    // Handle ping
    socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
  }
};

// Message handler middleware
wsManager.use(async (socket, message, context, next) => {
  try {
    const data = JSON.parse(message.data);

    // Validate message format
    if (!data.type) {
      socket.send(JSON.stringify({
        type: 'error',
        error: 'Missing message type'
      }));
      return;
    }

    // Rate limiting
    const allowed = await checkRateLimit(context.userId);
    if (!allowed) {
      socket.send(JSON.stringify({
        type: 'error',
        error: 'Rate limit exceeded'
      }));
      return;
    }

    // Route message
    const handler = messageRouter[data.type];
    if (handler) {
      await handler(socket, data, context);
    } else {
      socket.send(JSON.stringify({
        type: 'error',
        error: 'Unknown message type'
      }));
    }

  } catch (error) {
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Invalid message format'
    }));
  }
});
```

## WebSocket Pool

### Connection Pooling

Manage multiple WebSocket connections efficiently.

```js
const pool = new WebSocketPool({
  maxConnections: 100,           // Maximum connections per pool
  minConnections: 10,            // Minimum connections to maintain
  acquireTimeout: 30000,         // Timeout for acquiring connection
  idleTimeout: 300000,           // Close idle connections after 5 minutes
  validateOnCheckout: true,      // Validate connection before use
  loadBalancing: 'least-connections'  // Load balancing strategy
});

// Acquire connection from pool
const connection = await pool.acquire();

// Use connection
connection.send(JSON.stringify({ type: 'message', data: 'hello' }));

// Release connection back to pool
pool.release(connection);

// Pool statistics
console.log({
  active: pool.getActiveCount(),
  idle: pool.getIdleCount(),
  waiting: pool.getWaitingCount()
});
```

### Load Balancing

Distribute connections across multiple backend servers.

```js
// Backend servers
const backends = [
  { id: 'ws-1', url: 'wss://ws1.example.com', weight: 2 },
  { id: 'ws-2', url: 'wss://ws2.example.com', weight: 1 },
  { id: 'ws-3', url: 'wss://ws3.example.com', weight: 1 }
];

// Load balanced pool
const lbPool = new WebSocketPool({
  backends,
  loadBalancing: 'weighted-round-robin',
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
    path: '/health'
  }
});

// Connections are automatically load balanced
const connection = await lbPool.acquire();
```

### Connection Health Monitoring

Monitor connection health and handle failures.

```js
const pool = new WebSocketPool({
  backends,
  healthCheck: {
    enabled: true,
    interval: 30000,           // Check every 30 seconds
    timeout: 5000,             // 5 second timeout
    unhealthyThreshold: 3,     // Mark unhealthy after 3 failures
    healthyThreshold: 2,       // Mark healthy after 2 successes
    path: '/health'            // Health check endpoint
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,       // Open after 5 failures
    recoveryTimeout: 60000     // Try recovery after 1 minute
  }
});

// Health status
const healthStatus = pool.getHealthStatus();
console.log(healthStatus);
// Output:
// {
//   'ws-1': { healthy: true, latency: 45, lastCheck: 1234567890 },
//   'ws-2': { healthy: false, latency: 0, lastCheck: 1234567891 }
// }

// Listen for health changes
pool.on('backend-healthy', (backendId) => {
  console.log(`Backend ${backendId} is healthy`);
});

pool.on('backend-unhealthy', (backendId, error) => {
  console.log(`Backend ${backendId} is unhealthy: ${error}`);
});
```

## Real-time Features

### Broadcasting

Broadcast messages to multiple connections.

```js
const { Broadcaster } = require('edge-utils/websocket');

const broadcaster = new Broadcaster();

// Create broadcast channels
const chatChannel = broadcaster.createChannel('chat');
const notificationsChannel = broadcaster.createChannel('notifications');

// Subscribe connections to channels
wsManager.use(async (socket, message, context) => {
  const data = JSON.parse(message.data);

  if (data.type === 'subscribe') {
    broadcaster.subscribe(socket, data.channel);
    socket.send(JSON.stringify({
      type: 'subscribed',
      channel: data.channel
    }));
  }

  if (data.type === 'unsubscribe') {
    broadcaster.unsubscribe(socket, data.channel);
    socket.send(JSON.stringify({
      type: 'unsubscribed',
      channel: data.channel
    }));
  }
});

// Broadcast to channel
const broadcastMessage = async (channel, message) => {
  await broadcaster.broadcast(channel, JSON.stringify({
    type: 'broadcast',
    channel,
    message,
    timestamp: Date.now()
  }));
};

// Usage
await broadcastMessage('chat', 'Hello everyone!');
await broadcastMessage('notifications', { type: 'update', data: updatedData });
```

### Pub/Sub System

Publish-subscribe messaging for decoupled communication.

```js
const { PubSub } = require('edge-utils/websocket');

const pubsub = new PubSub({
  persistence: true,            // Persist messages
  maxQueueSize: 1000,           // Max queued messages per topic
  messageTTL: 3600000           // Message TTL (1 hour)
});

// Subscribe to topics
const unsubscribe = pubsub.subscribe('user-updates', (message) => {
  console.log('User update:', message);
});

// Publish messages
await pubsub.publish('user-updates', {
  userId: 123,
  action: 'profile_updated',
  data: { name: 'John Doe' }
});

// Topic-based routing
wsManager.use(async (socket, message, context) => {
  const data = JSON.parse(message.data);

  if (data.type === 'subscribe-topic') {
    const unsubscribe = pubsub.subscribe(data.topic, (message) => {
      socket.send(JSON.stringify({
        type: 'topic-message',
        topic: data.topic,
        message
      }));
    });

    // Store unsubscribe function for cleanup
    context.subscriptions = context.subscriptions || [];
    context.subscriptions.push(unsubscribe);
  }
});
```

### Presence System

Track online users and their status.

```js
const { PresenceManager } = require('edge-utils/websocket');

const presence = new PresenceManager({
  heartbeatInterval: 30000,     // Heartbeat every 30 seconds
  heartbeatTimeout: 90000,      // Timeout after 90 seconds
  statusExpiration: 300000      // Status expires after 5 minutes
});

// Track user presence
wsManager.on('connection', async (socket, context) => {
  await presence.setPresence(context.userId, {
    status: 'online',
    lastSeen: Date.now(),
    metadata: {
      device: 'web',
      location: 'US'
    }
  });

  // Send presence updates to client
  const updatePresence = async () => {
    const presenceData = await presence.getPresence([context.userId]);
    socket.send(JSON.stringify({
      type: 'presence-update',
      presence: presenceData
    }));
  };

  // Update presence periodically
  const interval = setInterval(updatePresence, 60000); // Every minute

  socket.addEventListener('close', async () => {
    clearInterval(interval);
    await presence.setPresence(context.userId, {
      status: 'offline',
      lastSeen: Date.now()
    });
  });
});

// Get presence information
const userPresence = await presence.getPresence(['user1', 'user2']);
console.log(userPresence);
// Output:
// {
//   user1: { status: 'online', lastSeen: 1234567890, metadata: {...} },
//   user2: { status: 'offline', lastSeen: 1234567800, metadata: {...} }
// }
```

## Advanced Examples

### Chat Application

```js
const { WebSocketManager, Broadcaster, PresenceManager } = require('edge-utils/websocket');

// Chat application
class ChatServer {
  constructor() {
    this.wsManager = new WebSocketManager({
      maxConnections: 1000,
      authentication: { required: true }
    });

    this.broadcaster = new Broadcaster();
    this.presence = new PresenceManager();
    this.rooms = new Map(); // roomId -> Set of sockets
  }

  async handleConnection(socket, context) {
    const { userId, username } = context.user;

    // Join presence system
    await this.presence.setPresence(userId, {
      status: 'online',
      username,
      currentRoom: null
    });

    // Message handlers
    const messageHandlers = {
      'join-room': async (data) => {
        const { roomId } = data;

        // Leave current room
        if (context.currentRoom) {
          this.leaveRoom(socket, context.currentRoom);
        }

        // Join new room
        this.joinRoom(socket, roomId, context);
        context.currentRoom = roomId;

        // Update presence
        await this.presence.setPresence(userId, {
          status: 'online',
          username,
          currentRoom: roomId
        });

        // Notify room
        await this.broadcaster.broadcast(`room:${roomId}`, {
          type: 'user-joined',
          userId,
          username,
          timestamp: Date.now()
        });
      },

      'leave-room': async (data) => {
        if (context.currentRoom) {
          this.leaveRoom(socket, context.currentRoom);

          await this.broadcaster.broadcast(`room:${context.currentRoom}`, {
            type: 'user-left',
            userId,
            username,
            timestamp: Date.now()
          });

          context.currentRoom = null;
        }
      },

      'send-message': async (data) => {
        if (!context.currentRoom) return;

        const message = {
          type: 'message',
          id: generateId(),
          userId,
          username,
          content: data.content,
          timestamp: Date.now()
        };

        // Broadcast to room
        await this.broadcaster.broadcast(`room:${context.currentRoom}`, message);
      },

      'typing-start': async () => {
        if (!context.currentRoom) return;

        await this.broadcaster.broadcast(`room:${context.currentRoom}`, {
          type: 'typing-start',
          userId,
          username
        }, { exclude: socket });
      },

      'typing-stop': async () => {
        if (!context.currentRoom) return;

        await this.broadcaster.broadcast(`room:${context.currentRoom}`, {
          type: 'typing-stop',
          userId,
          username
        }, { exclude: socket });
      }
    };

    // Handle messages
    socket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        const handler = messageHandlers[data.type];

        if (handler) {
          await handler(data);
        }
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message'
        }));
      }
    });

    // Handle disconnection
    socket.addEventListener('close', async () => {
      if (context.currentRoom) {
        this.leaveRoom(socket, context.currentRoom);

        await this.broadcaster.broadcast(`room:${context.currentRoom}`, {
          type: 'user-left',
          userId,
          username,
          timestamp: Date.now()
        });
      }

      await this.presence.setPresence(userId, {
        status: 'offline',
        lastSeen: Date.now()
      });
    });
  }

  joinRoom(socket, roomId, context) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(socket);

    // Subscribe to room broadcasts
    this.broadcaster.subscribe(socket, `room:${roomId}`);
  }

  leaveRoom(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(socket);
      this.broadcaster.unsubscribe(socket, `room:${roomId}`);

      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  async accept(request) {
    const { socket, response, context } = await this.wsManager.accept(request);
    this.handleConnection(socket, context);
    return response;
  }
}

const chatServer = new ChatServer();
const handler = (request) => chatServer.accept(request);
```

### Real-time Notifications

```js
const { WebSocketManager, NotificationManager } = require('edge-utils/websocket');

// Real-time notification system
class NotificationServer {
  constructor() {
    this.wsManager = new WebSocketManager({
      authentication: { required: true }
    });

    this.notifications = new NotificationManager({
      persistence: true,
      maxNotifications: 100,      // Max notifications per user
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  async handleConnection(socket, context) {
    const { userId } = context.user;

    // Send pending notifications
    const pending = await this.notifications.getPending(userId);
    for (const notification of pending) {
      socket.send(JSON.stringify({
        type: 'notification',
        ...notification
      }));
    }

    // Mark as delivered
    await this.notifications.markDelivered(userId, pending.map(n => n.id));

    // Handle real-time notifications
    socket.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'mark-read') {
        await this.notifications.markRead(userId, data.notificationIds);
      }

      if (data.type === 'get-notifications') {
        const notifications = await this.notifications.getNotifications(userId, {
          limit: data.limit || 50,
          offset: data.offset || 0
        });

        socket.send(JSON.stringify({
          type: 'notifications',
          notifications
        }));
      }
    });
  }

  // Send notification to user
  async sendNotification(userId, notification) {
    const notif = {
      id: generateId(),
      ...notification,
      timestamp: Date.now(),
      read: false,
      delivered: false
    };

    // Store notification
    await this.notifications.store(userId, notif);

    // Try to send immediately if user is online
    const userSockets = this.wsManager.getUserSockets(userId);
    if (userSockets.length > 0) {
      for (const userSocket of userSockets) {
        userSocket.send(JSON.stringify({
          type: 'notification',
          ...notif
        }));
      }
      await this.notifications.markDelivered(userId, [notif.id]);
    }
  }

  async accept(request) {
    const { socket, response, context } = await this.wsManager.accept(request);
    this.handleConnection(socket, context);
    return response;
  }
}

const notificationServer = new NotificationServer();

// Send notification
await notificationServer.sendNotification('user123', {
  title: 'New Message',
  body: 'You have a new message from John',
  type: 'message',
  data: { messageId: 'msg123' }
});
```

### Live Collaboration

```js
const { WebSocketManager, OperationalTransform } = require('edge-utils/websocket');

// Live collaboration server
class CollaborationServer {
  constructor() {
    this.wsManager = new WebSocketManager();
    this.ot = new OperationalTransform();
    this.documents = new Map(); // docId -> document state
  }

  async handleConnection(socket, context) {
    socket.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'join-document') {
        await this.joinDocument(socket, data.documentId, context);
      }

      if (data.type === 'edit') {
        await this.handleEdit(socket, data, context);
      }

      if (data.type === 'cursor-move') {
        await this.handleCursorMove(socket, data, context);
      }
    });

    socket.addEventListener('close', () => {
      this.leaveDocument(socket, context);
    });
  }

  async joinDocument(socket, documentId, context) {
    context.documentId = documentId;

    // Get or create document
    if (!this.documents.has(documentId)) {
      this.documents.set(documentId, {
        content: '',
        version: 0,
        cursors: new Map(),
        connections: new Set()
      });
    }

    const document = this.documents.get(documentId);
    document.connections.add(socket);

    // Send current document state
    socket.send(JSON.stringify({
      type: 'document-state',
      content: document.content,
      version: document.version
    }));

    // Broadcast user joined
    this.broadcastToDocument(documentId, {
      type: 'user-joined',
      userId: context.userId
    }, { exclude: socket });
  }

  async handleEdit(socket, data, context) {
    const { documentId, operation, version } = data;
    const document = this.documents.get(documentId);

    if (!document) return;

    // Apply operational transform
    const transformedOp = this.ot.transform(operation, document.pendingOps || []);
    const newContent = this.ot.apply(document.content, transformedOp);

    // Update document
    document.content = newContent;
    document.version++;

    // Broadcast to other users
    this.broadcastToDocument(documentId, {
      type: 'edit',
      operation: transformedOp,
      version: document.version,
      userId: context.userId
    }, { exclude: socket });
  }

  async handleCursorMove(socket, data, context) {
    const { documentId, position } = data;
    const document = this.documents.get(documentId);

    if (!document) return;

    // Update cursor position
    document.cursors.set(context.userId, position);

    // Broadcast cursor position
    this.broadcastToDocument(documentId, {
      type: 'cursor-update',
      userId: context.userId,
      position
    }, { exclude: socket });
  }

  leaveDocument(socket, context) {
    if (context.documentId) {
      const document = this.documents.get(context.documentId);
      if (document) {
        document.connections.delete(socket);
        document.cursors.delete(context.userId);

        // Broadcast user left
        this.broadcastToDocument(context.documentId, {
          type: 'user-left',
          userId: context.userId
        });
      }
    }
  }

  broadcastToDocument(documentId, message, options = {}) {
    const document = this.documents.get(documentId);
    if (!document) return;

    for (const connection of document.connections) {
      if (options.exclude !== connection) {
        connection.send(JSON.stringify(message));
      }
    }
  }

  async accept(request) {
    const { socket, response, context } = await this.wsManager.accept(request);
    this.handleConnection(socket, context);
    return response;
  }
}

const collabServer = new CollaborationServer();
const handler = (request) => collabServer.accept(request);
```

## Performance Optimization

### Connection Scaling

Scale WebSocket connections across multiple instances.

```js
const { WebSocketCluster } = require('edge-utils/websocket');

// WebSocket cluster for scaling
const cluster = new WebSocketCluster({
  instances: 4,                 // Number of instances
  loadBalancing: 'ip-hash',     // Distribute connections
  stickySessions: true,         // Keep connections on same instance
  pubsub: {                     // Inter-instance communication
    type: 'redis',
    url: 'redis://localhost:6379'
  }
});

// Handle connections in cluster
cluster.on('connection', (socket, context) => {
  // Handle connection
});

// Broadcast across cluster
await cluster.broadcast('all-users', {
  type: 'announcement',
  message: 'Server maintenance in 5 minutes'
});
```

### Message Compression

Compress WebSocket messages for better performance.

```js
const wsManager = new WebSocketManager({
  compression: {
    enabled: true,
    algorithm: 'permessage-deflate',  // WebSocket compression
    threshold: 1024,                  // Compress messages > 1KB
    level: 6                          // Compression level
  }
});

// Automatic compression for large messages
socket.send(JSON.stringify(largeData)); // Automatically compressed
```

### Connection Pool Optimization

Optimize connection pool for high throughput.

```js
const pool = new WebSocketPool({
  maxConnections: 1000,
  minConnections: 100,
  acquireTimeout: 5000,
  idleTimeout: 60000,
  validateOnCheckout: false,    // Skip validation for performance
  evictionPolicy: {
    enabled: true,
    interval: 30000,            // Run eviction every 30 seconds
    maxIdleTime: 300000         // Evict connections idle > 5 minutes
  }
});
```

## Platform-Specific Notes

### Cloudflare Workers
- Use Durable Objects for WebSocket state management
- Compatible with Cloudflare's WebSocket API
- Support for Cloudflare's global network

### Vercel Edge Functions
- Native WebSocket support
- Compatible with Vercel's edge network
- Support for Vercel's deployment regions

### Deno Deploy
- Native WebSocket support
- Compatible with Deno's Web APIs
- Support for Deno KV for state management

## Best Practices

### Connection Limits

Set appropriate connection limits to prevent resource exhaustion:

```js
const wsManager = new WebSocketManager({
  maxConnections: 1000,         // Global limit
  maxConnectionsPerUser: 5,     // Per user limit
  maxConnectionsPerIP: 10       // Per IP limit
});
```

### Message Validation

Always validate incoming messages:

```js
const validateMessage = (data) => {
  // Check message structure
  if (!data.type || typeof data.type !== 'string') {
    throw new Error('Invalid message type');
  }

  // Check message size
  if (JSON.stringify(data).length > 65536) { // 64KB limit
    throw new Error('Message too large');
  }

  // Validate specific message types
  switch (data.type) {
    case 'chat':
      if (!data.message || typeof data.message !== 'string') {
        throw new Error('Invalid chat message');
      }
      break;
    // Add more validations...
  }
};
```

### Error Handling

Handle WebSocket errors gracefully:

```js
socket.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);

  // Clean up resources
  cleanupConnection(socket);

  // Notify other clients if needed
  notifyConnectionError(context);
});

socket.addEventListener('close', (event) => {
  console.log(`Connection closed: ${event.code} ${event.reason}`);

  // Clean up
  cleanupConnection(socket);
});
```

## Testing

Run WebSocket tests with:

```bash
npm test -- --testPathPattern=websocket.test.js
```

## API Reference

### WebSocketManager Methods
- `accept(request, options)` - Accept WebSocket connection
- `getActiveConnections()` - Get number of active connections
- `getUserSockets(userId)` - Get sockets for user
- `broadcast(message, filter)` - Broadcast to connections
- `close(code, reason)` - Close all connections

### WebSocketPool Methods
- `acquire()` - Acquire connection from pool
- `release(connection)` - Release connection to pool
- `getActiveCount()` - Get active connections count
- `getIdleCount()` - Get idle connections count
- `getHealthStatus()` - Get backend health status

### Broadcaster Methods
- `createChannel(name)` - Create broadcast channel
- `subscribe(socket, channel)` - Subscribe socket to channel
- `unsubscribe(socket, channel)` - Unsubscribe socket from channel
- `broadcast(channel, message, options)` - Broadcast to channel

## Contributing

When contributing to WebSocket utilities:

1. Maintain backward compatibility
2. Add comprehensive tests for connection handling
3. Update documentation for new features
4. Consider performance impact of changes
5. Test across all supported platforms

## License

MIT