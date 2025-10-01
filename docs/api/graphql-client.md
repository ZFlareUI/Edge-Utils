---
title: "GraphQL Client API"
description: "Complete API reference for the GraphQL client utilities"
---

# GraphQL Client API Reference

The GraphQL client provides a comprehensive interface for making GraphQL queries and mutations with caching, error handling, and performance optimizations.

## GraphQLClient

The main GraphQL client class for executing queries and mutations.

### Constructor

```js
new GraphQLClient(endpoint, options)
```

**Parameters:**
- `endpoint` (string): GraphQL API endpoint URL
- `options` (object, optional): Client configuration options

**Options:**
- `headers` (object): Default headers to include in requests
- `timeout` (number): Request timeout in milliseconds (default: 30000)
- `retries` (number): Number of retry attempts (default: 3)
- `cache` (CacheManager): Cache manager instance for caching responses
- `auth` (AuthManager): Authentication manager for handling auth
- `middlewares` (array): Array of middleware functions

### Methods

#### query(query, variables, options)

Execute a GraphQL query.

```js
const data = await client.query(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`, { id: '123' }, {
  headers: { 'Authorization': 'Bearer token' },
  timeout: 5000
});
```

**Parameters:**
- `query` (string): GraphQL query string
- `variables` (object, optional): Query variables
- `options` (object, optional): Request-specific options

**Returns:** Promise resolving to query result data

#### mutate(mutation, variables, options)

Execute a GraphQL mutation.

```js
const result = await client.mutate(`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
    }
  }
`, {
  id: '123',
  input: { name: 'John Doe' }
});
```

**Parameters:**
- `mutation` (string): GraphQL mutation string
- `variables` (object, optional): Mutation variables
- `options` (object, optional): Request-specific options

**Returns:** Promise resolving to mutation result data

#### subscribe(subscription, variables, options)

Execute a GraphQL subscription (WebSocket-based).

```js
const subscription = client.subscribe(`
  subscription OnUserUpdated($userId: ID!) {
    userUpdated(userId: $userId) {
      id
      name
      email
    }
  }
`, { userId: '123' });

subscription.on('data', (data) => {
  console.log('User updated:', data);
});

subscription.on('error', (error) => {
  console.error('Subscription error:', error);
});
```

**Parameters:**
- `subscription` (string): GraphQL subscription string
- `variables` (object, optional): Subscription variables
- `options` (object, optional): Subscription options

**Returns:** EventEmitter for handling subscription events

#### batch(operations)

Execute multiple GraphQL operations in a single request.

```js
const results = await client.batch([
  {
    query: `query GetUser { user(id: "1") { name } }`,
    variables: {}
  },
  {
    query: `query GetPosts { posts { title } }`,
    variables: {}
  }
]);
```

**Parameters:**
- `operations` (array): Array of operation objects with `query` and `variables`

**Returns:** Promise resolving to array of results

#### setHeader(name, value)

Set a default header for all requests.

```js
client.setHeader('Authorization', 'Bearer token');
client.setHeader('X-API-Key', 'api-key');
```

**Parameters:**
- `name` (string): Header name
- `value` (string): Header value

#### setHeaders(headers)

Set multiple default headers.

```js
client.setHeaders({
  'Authorization': 'Bearer token',
  'X-API-Key': 'api-key',
  'Content-Type': 'application/json'
});
```

**Parameters:**
- `headers` (object): Object containing header key-value pairs

#### clearCache()

Clear the client's cache.

```js
client.clearCache();
```

#### getCacheStats()

Get cache statistics.

```js
const stats = client.getCacheStats();
console.log(stats);
// Output: { hits: 150, misses: 25, size: 175 }
```

**Returns:** Object with cache statistics

## GraphQLQueryBuilder

Builder class for constructing GraphQL queries programmatically.

### Constructor

```js
new GraphQLQueryBuilder()
```

### Methods

#### select(field)

Add a field to select.

```js
const builder = new GraphQLQueryBuilder()
  .select('id')
  .select('name')
  .select('email');
```

**Parameters:**
- `field` (string): Field name to select

**Returns:** GraphQLQueryBuilder instance (chainable)

#### selectWithAlias(field, alias)

Add a field with an alias.

```js
const builder = new GraphQLQueryBuilder()
  .selectWithAlias('userName', 'name');
```

**Parameters:**
- `field` (string): Actual field name
- `alias` (string): Alias for the field

**Returns:** GraphQLQueryBuilder instance (chainable)

#### selectObject(field, subBuilder)

Add a nested object selection.

```js
const userBuilder = new GraphQLQueryBuilder()
  .select('id')
  .select('name');

const builder = new GraphQLQueryBuilder()
  .selectObject('user', userBuilder);
```

**Parameters:**
- `field` (string): Object field name
- `subBuilder` (GraphQLQueryBuilder): Builder for nested selection

**Returns:** GraphQLQueryBuilder instance (chainable)

#### withArguments(args)

Add arguments to the current selection.

```js
const builder = new GraphQLQueryBuilder()
  .select('user')
  .withArguments({ id: '123' });
```

**Parameters:**
- `args` (object): Arguments object

**Returns:** GraphQLQueryBuilder instance (chainable)

#### withDirective(directive)

Add a directive to the current selection.

```js
const builder = new GraphQLQueryBuilder()
  .select('posts')
  .withDirective('@include(if: $showPosts)');
```

**Parameters:**
- `directive` (string): GraphQL directive

**Returns:** GraphQLQueryBuilder instance (chainable)

#### build()

Build the GraphQL query string.

```js
const query = builder.build();
// Output: "{\n  id\n  name\n  email\n}"
```

**Returns:** GraphQL query string

#### buildQuery(operationName, variables)

Build a complete query with operation name and variables.

```js
const query = builder.buildQuery('GetUser', { id: '123' });
// Output: "query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n  }\n}"
```

**Parameters:**
- `operationName` (string, optional): Operation name
- `variables` (object, optional): Variables object

**Returns:** Complete GraphQL query string

## GraphQLSchema

Utilities for working with GraphQL schemas.

### Constructor

```js
new GraphQLSchema(schema)
```

**Parameters:**
- `schema` (string|object): GraphQL schema SDL string or parsed schema object

### Methods

#### getType(name)

Get a type from the schema.

```js
const userType = schema.getType('User');
```

**Parameters:**
- `name` (string): Type name

**Returns:** Type definition object

#### getQueryType()

Get the Query type.

```js
const queryType = schema.getQueryType();
```

**Returns:** Query type definition

#### getMutationType()

Get the Mutation type.

```js
const mutationType = schema.getMutationType();
```

**Returns:** Mutation type definition

#### getFields(typeName)

Get fields for a given type.

```js
const userFields = schema.getFields('User');
console.log(userFields);
// Output: ['id', 'name', 'email', 'posts']
```

**Parameters:**
- `typeName` (string): Type name

**Returns:** Array of field names

#### validateQuery(query)

Validate a GraphQL query against the schema.

```js
const errors = schema.validateQuery(`
  query GetUser {
    user(id: "123") {
      id
      name
      invalidField
    }
  }
`);

if (errors.length > 0) {
  console.log('Validation errors:', errors);
}
```

**Parameters:**
- `query` (string): GraphQL query string

**Returns:** Array of validation errors

#### getPossibleTypes(typeName)

Get possible types for a union or interface.

```js
const possibleTypes = schema.getPossibleTypes('Node');
console.log(possibleTypes);
// Output: ['User', 'Post', 'Comment']
```

**Parameters:**
- `typeName` (string): Union or interface type name

**Returns:** Array of possible type names

## createGraphQLMiddleware

Create middleware for handling GraphQL requests.

```js
const middleware = createGraphQLMiddleware({
  endpoint: 'https://api.example.com/graphql',
  cache: new CacheManager(),
  auth: new AuthManager()
});

export default {
  async fetch(request) {
    return await middleware(request);
  }
}
```

**Parameters:**
- `options` (object): Middleware configuration options

**Options:**
- `endpoint` (string): GraphQL endpoint URL
- `cache` (CacheManager, optional): Cache manager instance
- `auth` (AuthManager, optional): Authentication manager
- `introspection` (boolean): Enable GraphQL introspection (default: false)
- `playground` (boolean): Enable GraphQL playground (default: false)

**Returns:** Middleware function

## Error Types

### GraphQLError

Custom error class for GraphQL-related errors.

```js
class GraphQLError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
```

**Properties:**
- `code` (string): Error code
- `details` (object): Additional error details

### Common Error Codes

- `GRAPHQL_VALIDATION_ERROR`: Query validation failed
- `GRAPHQL_EXECUTION_ERROR`: Query execution failed
- `NETWORK_ERROR`: Network request failed
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Authorization failed
- `RATE_LIMIT_ERROR`: Rate limit exceeded

## Type Definitions

### GraphQLOperation

```typescript
interface GraphQLOperation {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}
```

### GraphQLResponse

```typescript
interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
}
```

### GraphQLRequestOptions

```typescript
interface GraphQLRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean | CacheOptions;
  auth?: boolean | AuthOptions;
}
```

## Examples

### Basic Query

```js
import { GraphQLClient } from 'edge-utils';

const client = new GraphQLClient('https://api.example.com/graphql');

const user = await client.query(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`, { id: '123' });
```

### Cached Query

```js
import { GraphQLClient, CacheManager } from 'edge-utils';

const cache = new CacheManager({ ttl: 300000 });
const client = new GraphQLClient('https://api.example.com/graphql', {
  cache
});

const posts = await client.query(`
  query GetPosts {
    posts {
      id
      title
      content
    }
  }
`); // Automatically cached
```

### Mutation with Authentication

```js
import { GraphQLClient, AuthManager } from 'edge-utils';

const auth = new AuthManager({ jwtSecret: 'secret' });
const client = new GraphQLClient('https://api.example.com/graphql', {
  auth
});

const result = await client.mutate(`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
    }
  }
`, {
  input: {
    title: 'New Post',
    content: 'Post content'
  }
});
```

### Subscription

```js
import { GraphQLClient } from 'edge-utils';

const client = new GraphQLClient('wss://api.example.com/graphql');

const subscription = client.subscribe(`
  subscription OnPostCreated {
    postCreated {
      id
      title
      author {
        name
      }
    }
  }
`);

subscription.on('data', (data) => {
  console.log('New post:', data.postCreated);
});

subscription.on('error', (error) => {
  console.error('Subscription error:', error);
});
```

### Using Query Builder

```js
import { GraphQLQueryBuilder } from 'edge-utils';

const builder = new GraphQLQueryBuilder();

const query = builder
  .select('user')
  .withArguments({ id: '$userId' })
  .selectObject('posts', new GraphQLQueryBuilder()
    .select('id')
    .select('title')
    .select('content')
  )
  .buildQuery('GetUserPosts', { userId: 'ID!' });

console.log(query);
// Output:
// query GetUserPosts($userId: ID!) {
//   user(id: $userId) {
//     posts {
//       id
//       title
//       content
//     }
//   }
// }
```

### Middleware Usage

```js
import { createGraphQLMiddleware } from 'edge-utils';

const middleware = createGraphQLMiddleware({
  endpoint: 'https://api.example.com/graphql',
  cache: new CacheManager({ ttl: 300000 }),
  auth: new AuthManager({ jwtSecret: 'secret' }),
  playground: true // Enable GraphQL playground in development
});

export default {
  async fetch(request) {
    // Handle GraphQL requests
    if (request.url.endsWith('/graphql')) {
      return await middleware(request);
    }

    // Handle other requests
    return new Response('Not found', { status: 404 });
  }
};
```