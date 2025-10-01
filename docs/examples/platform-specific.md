---
title: "Platform-Specific Examples"
description: "Platform-specific usage examples for Cloudflare Workers, Vercel Edge, and Deno Deploy"
---

# Platform-Specific Examples

Edge-Utils is designed to work seamlessly across different edge platforms. Here are platform-specific examples and optimizations.

## Cloudflare Workers

### Basic Worker Setup

```js
// wrangler.toml
name = "edge-utils-app"
main = "src/index.js"
compatibility_date = "2023-01-01"

[build]
command = "npm run build"

// src/index.js
import { GraphQLClient, CacheManager, EdgeBackend } from '@edge-utils/cloudflare';

export default {
  async fetch(request, env, ctx) {
    const cache = new CacheManager({
      backend: new EdgeBackend(),
      platform: 'cloudflare'
    });

    const client = new GraphQLClient({
      endpoint: env.GRAPHQL_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${env.API_TOKEN}`
      }
    });

    // Check cache first
    const cacheKey = `graphql:${request.url}`;
    let data = await cache.get(cacheKey);

    if (!data) {
      const query = `
        query GetData {
          users {
            id
            name
          }
        }
      `;

      const result = await client.query(query);
      data = result.data;

      // Cache for 5 minutes
      await cache.set(cacheKey, data, { ttl: 300000 });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### Durable Objects with WebSocket

```js
// Durable Object for WebSocket connections
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = [];
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.connections.push(server);

    server.accept();

    server.addEventListener('message', async (event) => {
      // Broadcast to all connections
      const message = JSON.parse(event.data);
      for (const conn of this.connections) {
        if (conn !== server) {
          conn.send(JSON.stringify({
            ...message,
            timestamp: Date.now()
          }));
        }
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
}
```

### KV Storage Integration

```js
import { CacheManager, KVBackend } from '@edge-utils/cloudflare';

export default {
  async fetch(request, env, ctx) {
    const cache = new CacheManager({
      backend: new KVBackend({
        kv: env.MY_KV_NAMESPACE
      }),
      strategies: ['cache-first', 'network-first']
    });

    const key = new URL(request.url).pathname;

    // Try cache first
    let data = await cache.get(key);
    if (!data) {
      // Fetch from API
      const response = await fetch(`${env.API_BASE_URL}${key}`);
      data = await response.json();

      // Cache in KV
      await cache.set(key, data, { ttl: 3600000 }); // 1 hour
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
```

## Vercel Edge Functions

### Edge Function Setup

```js
// vercel.json
{
  "functions": {
    "pages/api/graphql.js": {
      "runtime": "@vercel/node"
    },
    "pages/api/cache.js": {
      "runtime": "@vercel/edge"
    }
  }
}

// pages/api/cache.js
import { CacheManager, EdgeBackend } from '@edge-utils/vercel';
import { NextRequest } from '@vercel/edge';

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const cache = new CacheManager({
    backend: new EdgeBackend(),
    platform: 'vercel'
  });

  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (request.method === 'GET') {
    const data = await cache.get(key);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    const data = await request.json();
    await cache.set(key, data, { ttl: 300000 });
    return new Response('OK');
  }
}
```

### Middleware with Authentication

```js
// middleware.js
import { AuthManager } from '@edge-utils/vercel';
import { NextResponse } from '@vercel/edge';

export const config = {
  matcher: '/api/:path*'
};

export default async function middleware(request) {
  const auth = new AuthManager({
    secret: process.env.JWT_SECRET,
    platform: 'vercel'
  });

  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await auth.verifyToken(token);
    request.user = payload;

    return NextResponse.next();
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}
```

### Streaming Responses

```js
// pages/api/stream.js
import { StreamingResponse } from '@edge-utils/vercel';

export const config = {
  runtime: 'edge'
};

export default async function handler() {
  const stream = new StreamingResponse();

  // Simulate streaming data
  const data = ['chunk1', 'chunk2', 'chunk3'];

  for (const chunk of data) {
    stream.write(JSON.stringify({ data: chunk }) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
  }

  stream.end();

  return new Response(stream.getReader(), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
```

## Deno Deploy

### Basic Deno Setup

```js
// main.ts
import { GraphQLClient, CacheManager, MemoryBackend } from 'https://deno.land/x/edge_utils/mod.ts';

const client = new GraphQLClient({
  endpoint: Deno.env.get('GRAPHQL_ENDPOINT'),
  headers: {
    'Authorization': `Bearer ${Deno.env.get('API_TOKEN')}`
  }
});

const cache = new CacheManager({
  backend: new MemoryBackend(),
  platform: 'deno'
});

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/data') {
    const cacheKey = 'api-data';

    // Check cache
    let data = await cache.get(cacheKey);
    if (!data) {
      const query = `
        query GetData {
          items {
            id
            name
          }
        }
      `;

      const result = await client.query(query);
      data = result.data;

      await cache.set(cacheKey, data, { ttl: 300000 });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not found', { status: 404 });
}

Deno.serve(handler);
```

### WebSocket with Deno

```js
// websocket.ts
import { WebSocketManager } from 'https://deno.land/x/edge_utils/mod.ts';

const wsManager = new WebSocketManager({
  url: 'wss://echo.websocket.org',
  platform: 'deno'
});

async function handleWebSocket(request: Request): Promise<Response> {
  const upgrade = request.headers.get('upgrade') || '';

  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket', { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    console.log('WebSocket connected');
  };

  socket.onmessage = (event) => {
    console.log('Received:', event.data);
    socket.send(`Echo: ${event.data}`);
  };

  socket.onclose = () => {
    console.log('WebSocket disconnected');
  };

  return response;
}

Deno.serve(handleWebSocket);
```

### File System Operations

```js
// file-cache.ts
import { CacheManager, FileBackend } from 'https://deno.land/x/edge_utils/mod.ts';

const cache = new CacheManager({
  backend: new FileBackend({
    directory: './cache'
  }),
  platform: 'deno'
});

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (request.method === 'GET') {
    const data = await cache.get(key);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    const data = await request.json();
    await cache.set(key, data);
    return new Response('OK');
  }

  return new Response('Method not allowed', { status: 405 });
}

Deno.serve(handler);
```

## Cross-Platform Patterns

### Environment Detection

```js
import { PlatformDetector } from '@edge-utils/core';

const platform = PlatformDetector.detect();

// Platform-specific configurations
const configs = {
  cloudflare: {
    cache: { backend: 'edge' },
    auth: { secret: CF_SECRET }
  },
  vercel: {
    cache: { backend: 'edge' },
    auth: { secret: VERCEL_SECRET }
  },
  deno: {
    cache: { backend: 'memory' },
    auth: { secret: DENO_SECRET }
  }
};

const config = configs[platform] || configs.deno;
```

### Universal Middleware

```js
class UniversalMiddleware {
  constructor(platform) {
    this.platform = platform;
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
  }

  async execute(request, context = {}) {
    let response = null;

    for (const middleware of this.middlewares) {
      response = await middleware(request, {
        ...context,
        platform: this.platform
      });

      if (response) break; // Middleware returned a response
    }

    return response || new Response('OK');
  }
}

// Usage across platforms
const middleware = new UniversalMiddleware(platform);

// Add platform-agnostic middlewares
middleware.use(async (request, context) => {
  // CORS middleware
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
});

middleware.use(async (request, context) => {
  // Authentication middleware
  const auth = new AuthManager({ platform: context.platform });
  const token = request.headers.get('authorization');

  if (token) {
    try {
      const payload = await auth.verifyToken(token.replace('Bearer ', ''));
      request.user = payload;
    } catch (error) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
});
```

### Performance Monitoring

```js
import { PerformanceMonitor } from '@edge-utils/performance';

function createPerformanceMonitor(platform) {
  const monitors = {
    cloudflare: () => new PerformanceMonitor({
      platform: 'cloudflare',
      collectMemory: true,
      collectCpu: false // Limited in CF
    }),
    vercel: () => new PerformanceMonitor({
      platform: 'vercel',
      collectMemory: true,
      collectCpu: true
    }),
    deno: () => new PerformanceMonitor({
      platform: 'deno',
      collectMemory: true,
      collectCpu: true
    })
  };

  return monitors[platform]?.() || monitors.deno();
}

const monitor = createPerformanceMonitor(platform);

// Monitor function execution
export async function monitoredHandler(request) {
  const timerId = monitor.start('request');

  try {
    const result = await processRequest(request);
    monitor.end('request');

    const duration = monitor.getDuration('request');
    console.log(`Request processed in ${duration}ms`);

    return result;
  } catch (error) {
    monitor.end('request');
    throw error;
  }
}
```