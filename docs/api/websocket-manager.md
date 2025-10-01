---
title: "WebSocket Manager API"
description: "Complete API reference for WebSocket utilities"
---

# WebSocket Manager API Reference

The WebSocket Manager provides comprehensive WebSocket connection handling, pooling, and real-time communication features.

## WebSocketManager

Main WebSocket connection management class.

### Constructor

```js
new WebSocketManager(options)
```

**Parameters:**
- `options` (object): WebSocket configuration options

**Options:**
- `maxConnections` (number): Maximum concurrent connections
- `connectionTimeout` (number): Connection timeout
- `heartbeatInterval` (number): Heartbeat interval
- `heartbeatTimeout` (number): Heartbeat timeout
- `authentication` (object): Authentication configuration
- `compression` (object): Compression settings
- `protocols` (array): Supported protocols

### Methods

#### accept(request, options)

Accept a WebSocket connection.

```js
const { socket, response, context } = await wsManager.accept(request);
```

**Parameters:**
- `request` (Request): HTTP request with WebSocket upgrade
- `options` (object, optional): Accept options

**Returns:** Promise resolving to socket, response, and context

#### getActiveConnections()

Get number of active connections.

```js
const count = wsManager.getActiveConnections();
```

**Returns:** Number of active connections

#### getUserSockets(userId)

Get sockets for a specific user.

```js
const sockets = wsManager.getUserSockets('user123');
```

**Parameters:**
- `userId` (string): User identifier

**Returns:** Array of WebSocket connections

#### broadcast(message, filter)

Broadcast message to connections.

```js
await wsManager.broadcast({ type: 'announcement', message: 'Hello!' });
```

**Parameters:**
- `message` (any): Message to broadcast
- `filter` (function, optional): Filter function for connections

#### close(code, reason)

Close all connections.

```js
await wsManager.close(1000, 'Server shutdown');
```

**Parameters:**
- `code` (number, optional): Close code
- `reason` (string, optional): Close reason

## WebSocketPool

Connection pooling for WebSocket connections.

### Constructor

```js
new WebSocketPool(options)
```

**Parameters:**
- `options` (object): Pool configuration options

**Options:**
- `maxConnections` (number): Maximum connections per pool
- `minConnections` (number): Minimum connections to maintain
- `acquireTimeout` (number): Timeout for acquiring connection
- `idleTimeout` (number): Close idle connections after
- `validateOnCheckout` (boolean): Validate connection before use

### Methods

#### acquire()

Acquire connection from pool.

```js
const connection = await pool.acquire();
```

**Returns:** Promise resolving to WebSocket connection

#### release(connection)

Release connection back to pool.

```js
pool.release(connection);
```

**Parameters:**
- `connection` (WebSocket): Connection to release

#### getActiveCount()

Get active connections count.

```js
const count = pool.getActiveCount();
```

**Returns:** Number of active connections

#### getIdleCount()

Get idle connections count.

```js
const count = pool.getIdleCount();
```

**Returns:** Number of idle connections

#### getHealthStatus()

Get backend health status.

```js
const health = pool.getHealthStatus();
```

**Returns:** Health status object

## Broadcaster

Message broadcasting utilities.

### Constructor

```js
new Broadcaster()
```

### Methods

#### createChannel(name)

Create broadcast channel.

```js
const channel = broadcaster.createChannel('chat');
```

**Parameters:**
- `name` (string): Channel name

**Returns:** Channel object

#### subscribe(socket, channel)

Subscribe socket to channel.

```js
broadcaster.subscribe(socket, 'chat');
```

**Parameters:**
- `socket` (WebSocket): WebSocket connection
- `channel` (string): Channel name

#### unsubscribe(socket, channel)

Unsubscribe socket from channel.

```js
broadcaster.unsubscribe(socket, 'chat');
```

**Parameters:**
- `socket` (WebSocket): WebSocket connection
- `channel` (string): Channel name

#### broadcast(channel, message, options)

Broadcast to channel.

```js
await broadcaster.broadcast('chat', { type: 'message', text: 'Hello!' });
```

**Parameters:**
- `channel` (string): Channel name
- `message` (any): Message to broadcast
- `options` (object, optional): Broadcast options

## Type Definitions

### WebSocketManagerOptions

```typescript
interface WebSocketManagerOptions {
  maxConnections?: number;
  connectionTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  authentication?: AuthOptions;
  compression?: CompressionOptions;
  protocols?: string[];
}
```

### WebSocketPoolOptions

```typescript
interface WebSocketPoolOptions {
  maxConnections?: number;
  minConnections?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  validateOnCheckout?: boolean;
}
```

### BroadcastOptions

```typescript
interface BroadcastOptions {
  exclude?: WebSocket;
  filter?: (socket: WebSocket) => boolean;
}
```