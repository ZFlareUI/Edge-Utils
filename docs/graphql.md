# GraphQL Utilities

The GraphQL utilities provide a comprehensive GraphQL client implementation specifically designed for edge environments, with built-in caching, error handling, middleware support, and query building capabilities.

## Features

- Edge-Optimized: Designed for Cloudflare Workers, Vercel Edge, and Deno Deploy
- Intelligent Caching: Built-in query result caching with TTL support
- Error Handling: Comprehensive error classification and recovery
- Middleware Support: Extensible middleware system for custom logic
- Query Builder: Fluent API for building GraphQL queries and mutations
- Request Deduplication: Automatic deduplication of identical concurrent requests
- Timeout Management: Configurable timeouts with proper cleanup
- Schema Validation: Basic GraphQL schema validation utilities

## Quick Start

```js
const { GraphQLClient } = require('edge-utils/graphql');

// Create client
const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  cache: { enabled: true, ttl: 300 },
  timeout: 10000
});

// Execute a query
const result = await client.query(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`, { id: '123' });

console.log(result.data.user);
```

## GraphQLClient

The main GraphQL client class with full feature support.

### Constructor Options

```js
const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql', // GraphQL endpoint URL
  headers: {                                    // Default headers
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  cache: {                                      // Cache configuration
    enabled: true,
    ttl: 300,                                 // Time to live in seconds
    maxSize: 100                              // Maximum cache entries
  },
  timeout: 10000,                              // Request timeout in ms
  retries: 3,                                  // Number of retries on failure
  retryDelay: 1000,                            // Delay between retries in ms
  middleware: [middleware1, middleware2]       // Request middleware
});
```

### Query Execution

#### Basic Query
```js
const result = await client.query(`
  query GetPosts {
    posts {
      id
      title
      author {
        name
      }
    }
  }
`);

if (result.errors) {
  console.error('GraphQL errors:', result.errors);
} else {
  console.log('Posts:', result.data.posts);
}
```

#### Query with Variables
```js
const result = await client.query(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`, { id: '123' });
```

#### Mutation
```js
const result = await client.mutate(`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`, {
  input: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

### Caching

The client includes intelligent caching with automatic cache invalidation and TTL support.

```js
// Enable caching
const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  cache: {
    enabled: true,
    ttl: 300,     // 5 minutes
    maxSize: 100  // Maximum 100 cached queries
  }
});

// Cache is automatically used for identical queries
const result1 = await client.query('query { posts { id title } }');
const result2 = await client.query('query { posts { id title } }'); // Served from cache

// Clear cache manually
client.clearCache();

// Get cache statistics
const stats = client.getCacheStats();
console.log(`Cache size: ${stats.size}, Active requests: ${stats.activeRequests}`);
```

### Error Handling

Comprehensive error handling with severity classification and recovery strategies.

```js
const result = await client.query('query { invalidField }');

if (result.errors) {
  result.errors.forEach(error => {
    console.log(`Error severity: ${error.severity}`);
    console.log(`Error message: ${error.message}`);

    switch (error.severity) {
      case 'CRITICAL':
        // Network or server errors - may need to retry or fail fast
        break;
      case 'ERROR':
        // GraphQL validation or execution errors
        break;
      case 'WARNING':
        // Non-critical issues
        break;
    }
  });
}
```

### Middleware

Extensible middleware system for custom request/response processing.

```js
// Logging middleware
const loggingMiddleware = {
  onRequest: (operation, query, variables, context) => {
    console.log(`Executing ${operation}:`, { query, variables });
    return { startTime: Date.now() };
  },
  onResponse: (result, context) => {
    const duration = Date.now() - context.startTime;
    console.log(`Request completed in ${duration}ms`);
  },
  onError: (error, context) => {
    console.error('GraphQL request failed:', error);
  }
};

// Authentication middleware
const authMiddleware = {
  onRequest: (operation, query, variables, context) => {
    // Add auth token to headers
    context.headers = {
      ...context.headers,
      'Authorization': `Bearer ${getAuthToken()}`
    };
  }
};

// Add middleware to client
const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  middleware: [loggingMiddleware, authMiddleware]
});
```

### Request Deduplication

Automatic deduplication of identical concurrent requests to prevent duplicate API calls.

```js
// Multiple identical requests will be automatically deduplicated
const promise1 = client.query('query { posts { id title } }');
const promise2 = client.query('query { posts { id title } }');
const promise3 = client.query('query { posts { id title } }');

// All three promises will resolve with the same result
const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
```

## GraphQLQueryBuilder

Fluent API for building GraphQL queries and mutations programmatically.

### Building Queries

```js
const { GraphQLQueryBuilder } = require('edge-utils/graphql');

const query = GraphQLQueryBuilder.buildQuery(
  'GetUser',
  ['id', 'name', 'email', { posts: ['id', 'title'] }],
  { id: '123' }
);

console.log(query);
// Output:
// query GetUser($id: ID!) {
//   GetUser(id: $id) {
//     id
//     name
//     email
//     posts {
//       id
//       title
//     }
//   }
// }
```

### Building Mutations

```js
const mutation = GraphQLQueryBuilder.buildMutation(
  'CreateUser',
  { name: 'John Doe', email: 'john@example.com' },
  ['id', 'name', 'email']
);

console.log(mutation);
// Output:
// mutation {
//   CreateUser(input: {name: "John Doe", email: "john@example.com"}) {
//     id
//     name
//     email
//   }
// }
```

## GraphQLSchema

Utilities for GraphQL schema validation and analysis.

### Query Validation

```js
const { GraphQLSchema } = require('edge-utils/graphql');

const query = `
  query GetUser {
    user(id: "123") {
      name
      email
    }
  }
`;

const validation = GraphQLSchema.validateQuery(query);
if (validation.isValid) {
  console.log('Query is valid');
} else {
  console.log('Validation errors:', validation.errors);
}
```

### Operation Detection

```js
const query = 'query GetUsers { users { id name } }';
const mutation = 'mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }';

console.log(GraphQLSchema.isQueryOperation(query));     // true
console.log(GraphQLSchema.isMutationOperation(query));  // false
console.log(GraphQLSchema.isMutationOperation(mutation)); // true

const operations = GraphQLSchema.extractOperationNames(query);
console.log(operations); // ['GetUsers']
```

## GraphQL Middleware

Edge-compatible middleware for handling GraphQL requests in serverless environments.

### Basic Usage

```js
const { createGraphQLMiddleware } = require('edge-utils/graphql');

const middleware = createGraphQLMiddleware({
  endpoint: 'https://api.example.com/graphql',
  cache: { enabled: true, ttl: 300 }
});

// Handle GraphQL requests
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'POST' && new URL(request.url).pathname === '/graphql') {
      return await middleware.handleRequest(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  }
};
```

### CORS Handling

```js
// Handle CORS preflight requests
const corsResponse = middleware.handleOptions(request);
if (corsResponse) {
  return corsResponse;
}
```

## Error Types

### GraphQLError

Custom error class with severity levels for better error handling.

```js
const { GraphQLError, ErrorSeverity } = require('edge-utils/graphql');

throw new GraphQLError(
  'Authentication required',
  ErrorSeverity.ERROR,
  { code: 'UNAUTHENTICATED' }
);
```

### Error Severity Levels

- `CRITICAL`: Network errors, timeouts, server errors (5xx)
- `ERROR`: GraphQL validation errors, authentication failures
- `WARNING`: Deprecation warnings, non-critical issues

## Advanced Examples

### Complete Edge Function with GraphQL

```js
const { GraphQLClient, createGraphQLMiddleware } = require('edge-utils/graphql');

// Create GraphQL client
const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  cache: { enabled: true, ttl: 300 },
  timeout: 10000,
  middleware: [
    {
      onRequest: (operation, query, variables, context) => {
        // Add authentication
        context.headers = {
          ...context.headers,
          'Authorization': `Bearer ${env.GRAPHQL_TOKEN}`
        };
      }
    }
  ]
});

// Create middleware for handling requests
const middleware = createGraphQLMiddleware({
  endpoint: 'https://api.example.com/graphql',
  cache: { enabled: true, ttl: 300 }
});

// Edge function handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // GraphQL endpoint
    if (url.pathname === '/graphql') {
      return await middleware.handleRequest(request, env, ctx);
    }

    // API endpoint using GraphQL client
    if (url.pathname.startsWith('/api/')) {
      try {
        const result = await client.query(`
          query GetData {
            users {
              id
              name
            }
          }
        `);

        return new Response(JSON.stringify(result.data), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }
};
```

### Complex Query Building

```js
const { GraphQLQueryBuilder } = require('edge-utils/graphql');

// Build complex nested query
const complexQuery = GraphQLQueryBuilder.buildQuery(
  'GetUserProfile',
  [
    'id',
    'name',
    'email',
    {
      posts: [
        'id',
        'title',
        'content',
        {
          comments: [
            'id',
            'text',
            {
              author: ['id', 'name']
            }
          ]
        }
      ]
    },
    {
      followers: ['id', 'name', 'avatar']
    }
  ],
  { userId: '123', limit: 10 }
);

console.log(complexQuery);
```

### Error Recovery and Retry Logic

```js
const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  retries: 3,
  retryDelay: 1000,
  middleware: [
    {
      onError: (error, context) => {
        if (error.severity === 'CRITICAL' && context.retryCount < 3) {
          // Implement exponential backoff
          const delay = Math.pow(2, context.retryCount) * 1000;
          return new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  ]
});

// Automatic retry on critical errors
const result = await client.query('query { data }');
```

## Performance Considerations

### Caching Strategy
- Use appropriate TTL values based on data freshness requirements
- Monitor cache hit rates and adjust cache size accordingly
- Consider cache warming for frequently accessed data

### Timeout Management
- Set reasonable timeouts to prevent hanging requests
- Use shorter timeouts for real-time operations
- Implement proper timeout cleanup to prevent memory leaks

### Request Deduplication
- Automatically reduces API load for identical concurrent requests
- Particularly useful for popular data that multiple users request simultaneously

### Memory Usage
- Cache size should be limited based on available memory
- Implement cache eviction policies for long-running applications
- Monitor memory usage in production environments

## Platform-Specific Notes

### Cloudflare Workers
- Uses Web APIs (fetch, AbortController)
- Compatible with KV storage for distributed caching
- Supports Durable Objects for advanced caching scenarios

### Vercel Edge Functions
- Full Web API support
- Compatible with Edge Config for caching
- Supports environment variables for configuration

### Deno Deploy
- Native performance with Deno runtime
- Compatible with Deno KV for caching
- Supports all modern JavaScript features

## Testing

The GraphQL utilities include comprehensive test coverage. Run tests with:

```bash
npm test -- --testPathPattern=graphql.test.js
```

## API Reference

### GraphQLClient Methods

- `query(query, variables, options)` - Execute GraphQL query
- `mutate(mutation, variables, options)` - Execute GraphQL mutation
- `clearCache()` - Clear all cached results
- `getCacheStats()` - Get cache statistics

### GraphQLQueryBuilder Methods

- `buildQuery(operationName, fields, args)` - Build GraphQL query
- `buildMutation(operationName, input, returnFields)` - Build GraphQL mutation

### GraphQLSchema Methods

- `validateQuery(query, schema)` - Validate GraphQL query
- `extractOperationNames(query)` - Extract operation names
- `isQueryOperation(query)` - Check if query operation
- `isMutationOperation(query)` - Check if mutation operation

### GraphQLMiddleware Methods

- `handleRequest(request, env, ctx)` - Handle GraphQL requests
- `handleOptions(request)` - Handle CORS preflight requests

## Contributing

When contributing to the GraphQL utilities:

1. Maintain backward compatibility
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Follow the existing code style and patterns
5. Test across all supported platforms

## License

MIT</content>
<parameter name="filePath">/Users/pratikacharya/Desktop/package/edge-utils/docs/graphql.md