---
title: "Testing Guide"
description: "Comprehensive guide to testing Edge-Utils"
---

# Testing Guide

This guide covers testing practices and procedures for Edge-Utils, ensuring code quality and reliability across edge platforms.

## Testing Philosophy

Edge-Utils follows these testing principles:

- **Comprehensive Coverage**: Test all code paths and edge cases
- **Platform Agnostic**: Tests work across Cloudflare, Vercel, and Deno
- **Performance Focused**: Tests validate performance characteristics
- **Integration Ready**: Tests cover real-world usage scenarios

## Test Structure

### Directory Organization

```
tests/
├── setup.js              # Global test setup
├── cache.test.js         # Cache module tests
├── geo.test.js           # Geographic utilities tests
├── platform.test.js      # Platform detection tests
├── utils.test.js         # Core utilities tests
├── integration/          # Integration tests
│   ├── cloudflare.test.js
│   ├── vercel.test.js
│   └── deno.test.js
└── performance/          # Performance tests
    ├── cache-perf.test.js
    └── streaming-perf.test.js
```

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test module interactions
3. **Performance Tests**: Validate performance characteristics
4. **Platform Tests**: Test platform-specific behavior

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/cache.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should handle TTL"
```

### Test Configuration

Jest configuration in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Writing Unit Tests

### Basic Test Structure

```js
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CacheManager } from '../src/cache/index.js';
import { MemoryBackend } from '../src/cache/memory.js';

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({
      backend: new MemoryBackend()
    });
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('set()', () => {
    it('should store a value', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should handle TTL', async () => {
      await cache.set('key', 'value', { ttl: 100 });
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });
});
```

### Test Utilities

Common testing utilities in `tests/setup.js`:

```js
// Global test setup
import { jest } from '@jest/globals';

// Mock timers
jest.useFakeTimers();

// Mock fetch for HTTP tests
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn();

// Mock performance APIs
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn()
};

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass
    };
  }
});
```

## Testing Strategies

### Cache Testing

```js
describe('Cache Backends', () => {
  describe('MemoryBackend', () => {
    let backend;

    beforeEach(() => {
      backend = new MemoryBackend();
    });

    it('should store and retrieve values', async () => {
      await backend.set('key', 'value');
      const result = await backend.get('key');
      expect(result).toBe('value');
    });

    it('should handle TTL expiration', async () => {
      await backend.set('key', 'value', { ttl: 100 });
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await backend.get('key');
      expect(result).toBeNull();
    });

    it('should handle concurrent access', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        backend.set(`key${i}`, `value${i}`)
      );
      await Promise.all(promises);

      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) => backend.get(`key${i}`))
      );

      results.forEach((result, i) => {
        expect(result).toBe(`value${i}`);
      });
    });
  });
});
```

### GraphQL Testing

```js
describe('GraphQLClient', () => {
  let client;
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    client = new GraphQLClient({
      endpoint: 'https://api.example.com/graphql'
    });
  });

  it('should execute queries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { user: { id: '1', name: 'John' } }
      })
    });

    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    `;

    const result = await client.query(query, { id: '1' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/graphql',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          query: expect.stringContaining('GetUser'),
          variables: { id: '1' }
        })
      })
    );

    expect(result.data.user).toEqual({
      id: '1',
      name: 'John'
    });
  });

  it('should handle errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        errors: [{ message: 'Invalid query' }]
      })
    });

    const query = 'invalid query';

    await expect(client.query(query)).rejects.toThrow('GraphQL request failed');
  });
});
```

### WebSocket Testing

```js
describe('WebSocketManager', () => {
  let wsManager;
  let mockWebSocket;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1
    };

    global.WebSocket = jest.fn(() => mockWebSocket);

    wsManager = new WebSocketManager({
      url: 'ws://example.com'
    });
  });

  it('should connect and send messages', async () => {
    mockWebSocket.addEventListener.mockImplementation((event, handler) => {
      if (event === 'open') {
        handler();
      }
    });

    await wsManager.connect();

    wsManager.send('test message');

    expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
  });

  it('should handle connection errors', async () => {
    mockWebSocket.addEventListener.mockImplementation((event, handler) => {
      if (event === 'error') {
        handler({ error: 'Connection failed' });
      }
    });

    await expect(wsManager.connect()).rejects.toThrow('Connection failed');
  });
});
```

## Integration Testing

### Platform Integration Tests

```js
// tests/integration/cloudflare.test.js
import { CacheManager } from '../../src/cache/index.js';
import { EdgeBackend } from '../../src/cache/edge.js';

describe('Cloudflare Integration', () => {
  let cache;

  beforeEach(() => {
    // Mock Cloudflare runtime
    global.caches = {
      default: {
        put: jest.fn(),
        match: jest.fn()
      }
    };

    cache = new CacheManager({
      backend: new EdgeBackend(),
      platform: 'cloudflare'
    });
  });

  it('should use Cloudflare cache API', async () => {
    global.caches.default.match.mockResolvedValue(null);
    global.caches.default.put.mockResolvedValue(undefined);

    await cache.set('key', 'value');

    expect(global.caches.default.put).toHaveBeenCalled();
  });
});
```

### End-to-End Testing

```js
describe('End-to-End Scenarios', () => {
  it('should handle complete request flow', async () => {
    // Mock all dependencies
    const mockCache = { get: jest.fn(), set: jest.fn() };
    const mockAuth = { verifyToken: jest.fn() };
    const mockGraphQL = { query: jest.fn() };

    // Set up mocks
    mockCache.get.mockResolvedValue(null);
    mockAuth.verifyToken.mockResolvedValue({ userId: '123' });
    mockGraphQL.query.mockResolvedValue({
      data: { user: { id: '123', name: 'John' } }
    });

    // Simulate complete request
    const request = new Request('http://example.com/api/user', {
      headers: { 'Authorization': 'Bearer token' }
    });

    // Process request through middleware stack
    const authResult = await mockAuth.verifyToken('token');
    const cacheResult = await mockCache.get('user:123');

    if (!cacheResult) {
      const data = await mockGraphQL.query('query { user(id: "123") { id name } }');
      await mockCache.set('user:123', data.data.user);
    }

    expect(authResult.userId).toBe('123');
    expect(mockGraphQL.query).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith('user:123', { id: '123', name: 'John' });
  });
});
```

## Performance Testing

### Benchmark Tests

```js
describe('Performance Benchmarks', () => {
  it('should handle high concurrent load', async () => {
    const cache = new CacheManager({
      backend: new MemoryBackend()
    });

    const startTime = Date.now();
    const operations = 1000;

    // Perform concurrent operations
    const promises = Array.from({ length: operations }, (_, i) =>
      cache.set(`key${i}`, `value${i}`)
    );

    await Promise.all(promises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time
    expect(duration).toBeLessThan(1000); // 1 second

    // Verify all operations succeeded
    const results = await Promise.all(
      Array.from({ length: operations }, (_, i) => cache.get(`key${i}`))
    );

    results.forEach((result, i) => {
      expect(result).toBe(`value${i}`);
    });
  });

  it('should maintain performance under memory pressure', async () => {
    const cache = new CacheManager({
      backend: new MemoryBackend(),
      maxMemory: 1024 * 1024 // 1MB limit
    });

    const largeData = 'x'.repeat(10000); // 10KB per item

    // Fill cache to near capacity
    for (let i = 0; i < 50; i++) {
      await cache.set(`key${i}`, largeData);
    }

    const startTime = Date.now();

    // Add more items (should trigger cleanup)
    for (let i = 50; i < 100; i++) {
      await cache.set(`key${i}`, largeData);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // 5 seconds max
  });
});
```

### Memory Leak Testing

```js
describe('Memory Leak Tests', () => {
  it('should not leak memory in long-running operations', async () => {
    const cache = new CacheManager({
      backend: new MemoryBackend()
    });

    // Perform many operations
    for (let i = 0; i < 10000; i++) {
      await cache.set(`key${i}`, `value${i}`, { ttl: 1000 });
      if (i % 1000 === 0) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }

    // Memory usage should remain reasonable
    const usage = process.memoryUsage();
    expect(usage.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
```

## Test Coverage

### Coverage Requirements

- **Statements**: >80%
- **Branches**: >80%
- **Functions**: >80%
- **Lines**: >80%

### Coverage Configuration

```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js",
      "!src/**/index.js"  // Exclude barrel exports
    ],
    "coverageReporters": [
      "text",
      "lcov",
      "html"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Improving Coverage

```js
// Test error conditions
it('should handle network errors', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  await expect(client.query('query')).rejects.toThrow('Network error');
});

// Test edge cases
it('should handle empty responses', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: {} })
  });

  const result = await client.query('query {}');
  expect(result.data).toEqual({});
});

// Test boundary conditions
it('should handle maximum TTL', async () => {
  const maxTTL = 2147483647; // 2^31 - 1
  await cache.set('key', 'value', { ttl: maxTTL });

  // Should not throw
  const result = await cache.get('key');
  expect(result).toBe('value');
});
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm install
    - run: npm test
    - run: npm run test:coverage
```

### Platform-Specific Testing

```yaml
# Test on multiple platforms
jobs:
  test-platforms:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [cloudflare, vercel, deno]

    steps:
    - uses: actions/checkout@v3
    - name: Test ${{ matrix.platform }}
      run: npm run test:${{ matrix.platform }}
```

## Debugging Tests

### Common Issues

**Async test timeouts**
```js
it('should complete within timeout', async () => {
  // Increase timeout for slow operations
}, 10000);
```

**Mock not working**
```js
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Flaky tests**
```js
// Use retry logic for flaky tests
jest.retryTimes(3);
```

### Debugging Tools

```bash
# Run tests with debug logging
DEBUG=* npm test

# Run single test with detailed output
npm test -- --verbose --testNamePattern="specific test"

# Generate coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Keep tests focused and small
- Use `beforeEach`/`afterEach` for setup/cleanup

### Mocking

- Mock external dependencies
- Use realistic mock data
- Reset mocks between tests
- Avoid mocking implementation details

### Assertions

- Use specific matchers (`toBe`, `toEqual`, `toContain`)
- Test both positive and negative cases
- Verify side effects
- Check error conditions

### Performance

- Keep tests fast (< 100ms each)
- Parallelize independent tests
- Use appropriate timeouts
- Monitor test execution time

This testing guide ensures Edge-Utils maintains high quality and reliability across all supported platforms and use cases.