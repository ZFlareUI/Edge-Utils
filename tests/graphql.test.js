/**
 * GraphQL utilities tests
 * Tests query execution, caching, error handling, and middleware functionality
 */

const {
  GraphQLClient,
  GraphQLError,
  GraphQLSchema,
  GraphQLQueryBuilder,
  createGraphQLMiddleware,
  OperationType,
  ErrorSeverity
} = require('../src/graphql/index.js');

// Mock fetch for testing
global.fetch = jest.fn();

describe('GraphQLClient', () => {
  let client;
  const mockEndpoint = 'https://api.example.com/graphql';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GraphQLClient({
      endpoint: mockEndpoint,
      headers: { 'Authorization': 'Bearer token' }
    });
  });

  describe('Query Execution', () => {
    test('should execute query successfully', async () => {
      const mockResponse = {
        data: { user: { id: 1, name: 'John' } }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.query('query { user { id name } }');

      expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        })
      }));

      expect(result).toEqual(mockResponse);
    });

    test('should execute mutation successfully', async () => {
      const mockResponse = {
        data: { createUser: { id: 2, name: 'Jane' } }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.mutate(
        'mutation($input: UserInput!) { createUser(input: $input) { id name } }',
        { input: { name: 'Jane' } }
      );

      expect(result).toEqual(mockResponse);
    });

    test('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'Field not found', extensions: { code: 'VALIDATION_ERROR' } }],
        data: null
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(client.query('query { invalidField }')).rejects.toThrow(GraphQLError);
    });

    test('should handle HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.query('query { test }')).rejects.toThrow(GraphQLError);
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.query('query { test }')).rejects.toThrow('Network error');
    });

    test('should handle timeout', async () => {
      // Create client and mock the abort signal creation
      client = new GraphQLClient({
        endpoint: mockEndpoint,
        timeout: 50
      });

      // Mock _createAbortSignal to return an already aborted signal
      client._createAbortSignal = jest.fn(() => {
        const controller = new AbortController();
        controller.abort(); // Immediately abort
        return controller.signal;
      });

      // Mock fetch to throw AbortError when signal is aborted
      global.fetch.mockImplementationOnce((url, options) => {
        if (options.signal && options.signal.aborted) {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} })
        });
      });

      await expect(client.query('query { test }')).rejects.toThrow(GraphQLError);
    });
  });

  describe('Caching', () => {
    test('should cache query results', async () => {
      const mockResponse = { data: { user: { id: 1 } } };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call should hit the network
      await client.query('query { user { id } }');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result = await client.query('query { user { id } }');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1 call
      expect(result).toEqual(mockResponse);
    });

    test('should not cache mutations', async () => {
      const mockResponse = { data: { updateUser: { id: 1 } } };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Both calls should hit the network
      await client.mutate('mutation { updateUser(id: 1) { id } }');
      await client.mutate('mutation { updateUser(id: 1) { id } }');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should skip cache when requested', async () => {
      const mockResponse = { data: { user: { id: 1 } } };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.query('query { user { id } }');
      await client.query('query { user { id } }', {}, { skipCache: true });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should clear cache', async () => {
      const mockResponse = { data: { user: { id: 1 } } };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.query('query { user { id } }');
      client.clearCache();

      await client.query('query { user { id } }');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should provide cache statistics', () => {
      const stats = client.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('activeRequests');
    });
  });

  describe('Event Handlers', () => {
    test('should call onSuccess handler', async () => {
      const onSuccess = jest.fn();
      client = new GraphQLClient({
        endpoint: mockEndpoint,
        onSuccess
      });

      const mockResponse = { data: { user: { id: 1 } } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.query('query { user { id } }');

      expect(onSuccess).toHaveBeenCalledWith(OperationType.QUERY, mockResponse);
    });

    test('should call onError handler', async () => {
      const onError = jest.fn();
      client = new GraphQLClient({
        endpoint: mockEndpoint,
        onError
      });

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.query('query { test }')).rejects.toThrow();

      expect(onError).toHaveBeenCalledWith(OperationType.QUERY, expect.any(Error));
    });
  });
});

describe('GraphQLError', () => {
  test('should create error with default severity', () => {
    const error = new GraphQLError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.severity).toBe(ErrorSeverity.ERROR);
    expect(error.name).toBe('GraphQLError');
  });

  test('should create error with custom severity', () => {
    const error = new GraphQLError('Critical error', ErrorSeverity.CRITICAL, { code: 500 });
    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    expect(error.details).toEqual({ code: 500 });
  });
});

describe('GraphQLSchema', () => {
  describe('Query Validation', () => {
    test('should validate valid query', () => {
      const result = GraphQLSchema.validateQuery('query { user { id name } }', {});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid query', () => {
      const result = GraphQLSchema.validateQuery('', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    test('should detect unbalanced braces', () => {
      const result = GraphQLSchema.validateQuery('query { user { id name ', {});
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('braces'))).toBe(true);
    });
  });

  describe('Operation Name Extraction', () => {
    test('should extract query operation names', () => {
      const query = `
        query GetUser { user { id } }
        query GetPosts { posts { title } }
      `;
      const names = GraphQLSchema.extractOperationNames(query);
      expect(names).toEqual(['GetUser', 'GetPosts']);
    });

    test('should extract mutation operation names', () => {
      const query = 'mutation CreateUser { createUser(input: {}) { id } }';
      const names = GraphQLSchema.extractOperationNames(query);
      expect(names).toEqual(['CreateUser']);
    });
  });

  describe('Operation Type Detection', () => {
    test('should detect query operations', () => {
      expect(GraphQLSchema.isQueryOperation('query { user }')).toBe(true);
      expect(GraphQLSchema.isQueryOperation('mutation { create }')).toBe(false);
    });

    test('should detect mutation operations', () => {
      expect(GraphQLSchema.isMutationOperation('mutation { create }')).toBe(true);
      expect(GraphQLSchema.isQueryOperation('mutation { create }')).toBe(false);
    });
  });
});

describe('GraphQLQueryBuilder', () => {
  describe('Query Building', () => {
    test('should build simple query', () => {
      const query = GraphQLQueryBuilder.buildQuery(
        'getUser',
        ['id', 'name', 'email'],
        { id: 1 }
      );

      expect(query).toContain('query getUser(id: 1)');
      expect(query).toContain('getUser(id)');
      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain('email');
    });

    test('should build query without arguments', () => {
      const query = GraphQLQueryBuilder.buildQuery('getUsers', ['id', 'name']);

      expect(query).toContain('query getUsers');
      expect(query).toContain('getUsers {');
      expect(query).not.toContain('(');
    });
  });

  describe('Mutation Building', () => {
    test('should build mutation', () => {
      const mutation = GraphQLQueryBuilder.buildMutation(
        'createUser',
        { name: 'John', email: 'john@example.com' },
        ['id', 'name', 'email']
      );

      expect(mutation).toContain('mutation');
      expect(mutation).toContain('createUser(input: {name:John,email:john@example.com})');
      expect(mutation).toContain('id');
      expect(mutation).toContain('name');
      expect(mutation).toContain('email');
    });
  });
});

describe('GraphQL Middleware', () => {
  let middleware;

  beforeEach(() => {
    middleware = createGraphQLMiddleware({
      endpoint: 'https://api.example.com/graphql'
    });
  });

  describe('Request Handling', () => {
    test('should handle valid GraphQL request', async () => {
      const mockResponse = { data: { user: { id: 1 } } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({
          query: 'query { user { id } }',
          variables: {},
          operationName: 'TestQuery'
        })
      };

      const response = await middleware.handleRequest(request, {}, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    test('should reject non-POST requests', async () => {
      const request = { method: 'GET' };
      const response = await middleware.handleRequest(request, {}, {});

      expect(response.status).toBe(405);
    });

    test('should reject requests without JSON content-type', async () => {
      const request = {
        method: 'POST',
        headers: new Map([['content-type', 'text/plain']])
      };
      const response = await middleware.handleRequest(request, {}, {});

      expect(response.status).toBe(400);
    });

    test('should reject requests without query', async () => {
      const request = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ variables: {} })
      };
      const response = await middleware.handleRequest(request, {}, {});

      expect(response.status).toBe(400);
    });

    test('should handle GraphQL errors in middleware', async () => {
      const mockResponse = {
        errors: [{ message: 'Field not found' }]
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({
          query: 'query { invalidField }',
          variables: {}
        })
      };

      const response = await middleware.handleRequest(request, {}, {});

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors).toBeDefined();
    });
  });

  describe('CORS Handling', () => {
    test('should handle OPTIONS requests', () => {
      const request = { method: 'OPTIONS' };
      const response = middleware.handleOptions(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    });
  });
});