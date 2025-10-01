---
title: "Quick Start"
description: "Get up and running with Edge-Utils in minutes"
---

# Quick Start

Get started with Edge-Utils in your edge computing project. This guide will walk you through installation and basic usage.

## Installation

Install Edge-Utils using your preferred package manager:

```bash
# npm
npm install edge-utils

# yarn
yarn add edge-utils

# pnpm
pnpm add edge-utils
```

## Basic Usage

### GraphQL Client

```js
import { GraphQLClient } from 'edge-utils';

export default {
  async fetch(request) {
    const client = new GraphQLClient('https://api.example.com/graphql');

    try {
      const data = await client.query(`
        query GetPosts {
          posts {
            id
            title
            content
          }
        }
      `);

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

### Caching

```js
import { GraphQLClient, CacheManager } from 'edge-utils';

export default {
  async fetch(request) {
    // Create cache manager
    const cache = new CacheManager({
      ttl: 300000, // 5 minutes
      maxSize: 100
    });

    // GraphQL client with caching
    const client = new GraphQLClient('https://api.example.com/graphql', {
      cache
    });

    const data = await client.query(`
      query GetUser($id: ID!) {
        user(id: $id) {
          name
          email
        }
      }
    `, { id: new URL(request.url).searchParams.get('id') });

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### WebSocket Real-time Communication

```js
import { WebSocketManager } from 'edge-utils';

const wsManager = new WebSocketManager({
  maxConnections: 100,
  heartbeatInterval: 30000
});

export default {
  async handleSession(websocket) {
    // Accept WebSocket connection
    const { socket, response } = await wsManager.accept(websocket);

    socket.addEventListener('message', (event) => {
      // Echo messages back
      socket.send(JSON.stringify({
        type: 'echo',
        data: event.data,
        timestamp: Date.now()
      }));
    });

    return response;
  }
};
```

### Authentication

```js
import { AuthManager } from 'edge-utils';

const auth = new AuthManager({
  jwtSecret: 'your-secret-key',
  apiKeys: ['your-api-key']
});

export default {
  async fetch(request) {
    // Authenticate request
    const user = await auth.authenticate(request);

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    return new Response(`Hello, ${user.name}!`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
```

## Platform-Specific Setup

### Cloudflare Workers

```js
// wrangler.toml
name = "my-edge-app"
main = "src/index.js"
compatibility_date = "2023-01-01"

// src/index.js
import { GraphQLClient } from 'edge-utils';

export default {
  async fetch(request, env) {
    const client = new GraphQLClient(env.GRAPHQL_ENDPOINT);
    // Your code here
  }
};
```

### Vercel Edge Functions

```js
// api/graphql.js
import { GraphQLClient } from 'edge-utils';

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const client = new GraphQLClient(process.env.GRAPHQL_ENDPOINT);
  // Your code here
}
```

### Deno Deploy

```js
// main.ts
import { GraphQLClient } from 'https://deno.land/x/edge_utils/mod.ts';

Deno.serve(async (request) => {
  const client = new GraphQLClient(Deno.env.get('GRAPHQL_ENDPOINT'));
  // Your code here
});
```

## Next Steps

Now that you have Edge-Utils set up, explore our comprehensive documentation:

- [Core Utilities](core/graphql) - Deep dive into GraphQL, caching, WebSocket, and auth
- [Edge Features](edge/performance) - Performance monitoring, geo utilities, and load balancing
- [Security & Monitoring](security/overview) - Security headers, monitoring, and content negotiation
- [API Reference](api/graphql-client) - Complete API documentation
- [Examples](examples/basic-usage) - More usage examples and patterns

## Need Help?

- Check our [full documentation](https://edge-utils.dev)
- Ask questions on [GitHub Discussions](https://github.com/ZFlareUI/Edge-Utils/discussions)
- Report issues on [GitHub Issues](https://github.com/ZFlareUI/Edge-Utils/issues)