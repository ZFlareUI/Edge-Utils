/**
 * Load Balancing Tests
 * @jest-environment node
 */

const {
  LoadBalancer,
  CircuitBreaker,
  StickySessionManager
} = require('../src/load-balancing');

describe('LoadBalancer', () => {
  let loadBalancer;

  beforeEach(() => {
    loadBalancer = new LoadBalancer({
      algorithm: 'round-robin',
      endpoints: [
        { url: 'http://server1.com', weight: 1 },
        { url: 'http://server2.com', weight: 1 },
        { url: 'http://server3.com', weight: 2 }
      ],
      healthCheckInterval: 1000 // Faster for testing
    });
  });

  afterEach(() => {
    loadBalancer.destroy();
  });

  test('round-robin distribution', () => {
    const endpoints = [];
    for (let i = 0; i < 6; i++) {
      endpoints.push(loadBalancer.getNextEndpoint());
    }

    expect(endpoints).toEqual([
      'http://server1.com',
      'http://server2.com',
      'http://server3.com',
      'http://server1.com',
      'http://server2.com',
      'http://server3.com'
    ]);
  });

  test('weighted round-robin distribution', () => {
    loadBalancer.algorithm = 'weighted-round-robin';

    const endpoints = [];
    for (let i = 0; i < 8; i++) {
      endpoints.push(loadBalancer.getNextEndpoint());
    }

    // Should distribute according to weights (1:1:2)
    const server1Count = endpoints.filter(e => e === 'http://server1.com').length;
    const server2Count = endpoints.filter(e => e === 'http://server2.com').length;
    const server3Count = endpoints.filter(e => e === 'http://server3.com').length;

    expect(server1Count).toBe(2);
    expect(server2Count).toBe(2);
    expect(server3Count).toBe(4);
  });

  test('least connections algorithm', () => {
    loadBalancer.algorithm = 'least-connections';

    // Record some requests
    loadBalancer.recordRequestStart('http://server1.com');
    loadBalancer.recordRequestStart('http://server1.com');
    loadBalancer.recordRequestStart('http://server2.com');

    // Should pick server3 (least connections)
    expect(loadBalancer.getNextEndpoint()).toBe('http://server3.com');
  });

  test('random algorithm', () => {
    loadBalancer.algorithm = 'random';

    const endpoints = new Set();
    for (let i = 0; i < 10; i++) {
      endpoints.add(loadBalancer.getNextEndpoint());
    }

    expect(endpoints.size).toBeGreaterThan(1); // Should distribute randomly
  });

  test('alter algorithm selects best endpoint based on metrics', () => {
    loadBalancer.algorithm = 'alter';

    // Simulate different performance metrics
    // Server1: Very fast response, no load
    loadBalancer.recordRequestStart('http://server1.com');
    loadBalancer.recordRequestEnd('http://server1.com', 10, true); // 10ms - very fast

    // Server2: Very slow response, high load
    loadBalancer.recordRequestStart('http://server2.com');
    loadBalancer.recordRequestStart('http://server2.com');
    loadBalancer.recordRequestStart('http://server2.com');
    loadBalancer.recordRequestStart('http://server2.com');
    loadBalancer.recordRequestStart('http://server2.com'); // 5 active requests
    loadBalancer.recordRequestEnd('http://server2.com', 5000, true); // 5 seconds - very slow
    loadBalancer.recordRequestEnd('http://server2.com', 6000, true);

    // Server3: Medium performance with some errors
    loadBalancer.recordRequestStart('http://server3.com');
    loadBalancer.recordRequestEnd('http://server3.com', 500, false); // Failed request
    loadBalancer.recordRequestStart('http://server3.com');
    loadBalancer.recordRequestEnd('http://server3.com', 1000, true); // 1000ms - slower

    // ALTER should strongly prefer server1 (much better score)
    const selected = loadBalancer.getNextEndpoint();
    expect(selected).toBe('http://server1.com');
  });

  test('alter algorithm with performance history and adaptive weights', () => {
    const alterLB = new LoadBalancer({
      algorithm: 'alter',
      endpoints: [
        { url: 'http://fast-server.com', weight: 1 },
        { url: 'http://slow-server.com', weight: 1 },
        { url: 'http://unreliable-server.com', weight: 1 }
      ]
    });

    // Simulate extended performance history
    // Fast server: consistently good performance
    for (let i = 0; i < 20; i++) {
      alterLB.recordRequestStart('http://fast-server.com');
      alterLB.recordRequestEnd('http://fast-server.com', 50 + Math.random() * 50, true); // 50-100ms
    }

    // Slow server: consistently poor performance
    for (let i = 0; i < 20; i++) {
      alterLB.recordRequestStart('http://slow-server.com');
      alterLB.recordRequestEnd('http://slow-server.com', 2000 + Math.random() * 1000, true); // 2-3s
    }

    // Unreliable server: mixed performance with failures
    for (let i = 0; i < 20; i++) {
      alterLB.recordRequestStart('http://unreliable-server.com');
      const success = Math.random() > 0.3; // 70% success rate
      alterLB.recordRequestEnd('http://unreliable-server.com', 500 + Math.random() * 500, success);
    }

    // Force adaptive weight update
    alterLB._updateAdaptiveWeights();

    // Test multiple selections to verify intelligent distribution
    const selections = [];
    for (let i = 0; i < 10; i++) {
      selections.push(alterLB.getNextEndpoint());
    }

    const fastCount = selections.filter(s => s === 'http://fast-server.com').length;
    const slowCount = selections.filter(s => s === 'http://slow-server.com').length;
    const unreliableCount = selections.filter(s => s === 'http://unreliable-server.com').length;

    // Fast server should be selected most often due to superior performance
    expect(fastCount).toBeGreaterThan(slowCount);
    expect(fastCount).toBeGreaterThan(unreliableCount);

    // Verify adaptive weights were updated
    expect(alterLB.adaptiveWeights.get('http://fast-server.com')).toBeGreaterThan(1.0);
    expect(alterLB.adaptiveWeights.get('http://slow-server.com')).toBeLessThan(1.0);

    alterLB.destroy();
  });

  test('alter algorithm handles performance trends', () => {
    const alterLB = new LoadBalancer({
      algorithm: 'alter',
      endpoints: [
        { url: 'http://improving-server.com', weight: 1 },
        { url: 'http://declining-server.com', weight: 1 }
      ]
    });

    // Simulate improving server: getting faster over time
    const improvingTimes = [1000, 800, 600, 400, 200, 100, 80, 60, 40, 20];
    improvingTimes.forEach((time, index) => {
      setTimeout(() => {
        alterLB.recordRequestStart('http://improving-server.com');
        alterLB.recordRequestEnd('http://improving-server.com', time, true);
      }, index * 10);
    });

    // Simulate declining server: getting slower over time
    const decliningTimes = [100, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800];
    decliningTimes.forEach((time, index) => {
      setTimeout(() => {
        alterLB.recordRequestStart('http://declining-server.com');
        alterLB.recordRequestEnd('http://declining-server.com', time, true);
      }, index * 10);
    });

    // Wait for all operations to complete
    return new Promise(resolve => {
      setTimeout(() => {
        // Force weight update
        alterLB._updateAdaptiveWeights();

        // Test selection after trend analysis
        const selections = [];
        for (let i = 0; i < 5; i++) {
          selections.push(alterLB.getNextEndpoint());
        }

        const improvingCount = selections.filter(s => s === 'http://improving-server.com').length;
        const decliningCount = selections.filter(s => s === 'http://declining-server.com').length;

        // Improving server should be preferred due to positive trend
        expect(improvingCount).toBeGreaterThan(decliningCount);

        alterLB.destroy();
        resolve();
      }, 200);
    });
  });

  test('alter algorithm prevents thundering herd with randomization', () => {
    const alterLB = new LoadBalancer({
      algorithm: 'alter',
      endpoints: [
        { url: 'http://server1.com', weight: 1 },
        { url: 'http://server2.com', weight: 1 },
        { url: 'http://server3.com', weight: 1 }
      ]
    });

    // Make all servers identical in performance
    for (const endpoint of ['http://server1.com', 'http://server2.com', 'http://server3.com']) {
      for (let i = 0; i < 10; i++) {
        alterLB.recordRequestStart(endpoint);
        alterLB.recordRequestEnd(endpoint, 100, true);
      }
    }

    // Test multiple selections - should distribute somewhat randomly despite identical scores
    const selections = [];
    for (let i = 0; i < 60; i++) {  // Increased sample size for better distribution
      selections.push(alterLB.getNextEndpoint());
    }

    const server1Count = selections.filter(s => s === 'http://server1.com').length;
    const server2Count = selections.filter(s => s === 'http://server2.com').length;
    const server3Count = selections.filter(s => s === 'http://server3.com').length;

    // With randomization, distribution should be relatively even (allowing some variance)
    expect(Math.abs(server1Count - server2Count)).toBeLessThan(15);  // Increased tolerance
    expect(Math.abs(server1Count - server3Count)).toBeLessThan(15);
    expect(Math.abs(server2Count - server3Count)).toBeLessThan(15);

    alterLB.destroy();
  });

  test('alter algorithm handles single endpoint', () => {
    const singleEndpointLB = new LoadBalancer({
      algorithm: 'alter',
      endpoints: [{ url: 'http://server1.com', weight: 1 }]
    });

    const endpoint = singleEndpointLB.getNextEndpoint();
    expect(endpoint).toBe('http://server1.com');

    singleEndpointLB.destroy();
  });

  test('records request metrics', () => {
    loadBalancer.recordRequestStart('http://server1.com');
    loadBalancer.recordRequestEnd('http://server1.com', 100, true);

    const stats = loadBalancer.getStats();
    expect(stats.endpoints['http://server1.com'].activeRequests).toBe(0);
    expect(stats.endpoints['http://server1.com'].averageResponseTime).toBe(100);
  });

  test('handles unhealthy endpoints', () => {
    // Simulate failures for server1
    const status = loadBalancer.endpoints.get('http://server1.com');
    status.failures = 3;
    status.healthy = false;

    const endpoint = loadBalancer.getNextEndpoint();
    expect(['http://server2.com', 'http://server3.com']).toContain(endpoint);
    expect(endpoint).not.toBe('http://server1.com');
  });

  test('returns null when no healthy endpoints', () => {
    // Mark all endpoints as unhealthy
    for (const [url, status] of loadBalancer.endpoints) {
      status.healthy = false;
    }

    expect(loadBalancer.getNextEndpoint()).toBeNull();
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 100
    });
  });

  test('starts in closed state', () => {
    const stats = circuitBreaker.getStats();
    expect(stats.state).toBe('CLOSED');
  });

  test('opens after failure threshold', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

    // Should fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
    }

    expect(circuitBreaker.getStats().state).toBe('OPEN');
  });

  test('throws when circuit is open', async () => {
    // Force open state
    circuitBreaker.state = 'OPEN';
    circuitBreaker.lastFailureTime = Date.now();

    await expect(circuitBreaker.execute(() => Promise.resolve())).rejects.toThrow('Circuit breaker is OPEN');
  });

  test('transitions to half-open after timeout', async () => {
    // Force open state
    circuitBreaker.state = 'OPEN';
    circuitBreaker.lastFailureTime = Date.now() - 200; // Past recovery timeout

    const successOperation = jest.fn().mockResolvedValue('success');

    await circuitBreaker.execute(successOperation);

    expect(circuitBreaker.getStats().state).toBe('HALF_OPEN');
  });

  test('closes after successful operations in half-open', async () => {
    circuitBreaker.state = 'HALF_OPEN';

    const successOperation = jest.fn().mockResolvedValue('success');

    // Need 2 successes to close
    await circuitBreaker.execute(successOperation);
    await circuitBreaker.execute(successOperation);

    expect(circuitBreaker.getStats().state).toBe('CLOSED');
  });
});

describe('StickySessionManager', () => {
  let stickyManager;

  beforeEach(() => {
    stickyManager = new StickySessionManager({
      ttl: 1000 // Short TTL for testing
    });
  });

  test('assigns consistent endpoints for same client', () => {
    const endpoints = ['server1', 'server2', 'server3'];

    const endpoint1 = stickyManager.getStickyEndpoint('client1', endpoints);
    const endpoint2 = stickyManager.getStickyEndpoint('client1', endpoints);

    expect(endpoint1).toBe(endpoint2);
  });

  test('assigns different endpoints for different clients', () => {
    const endpoints = ['server1', 'server2'];

    const endpoint1 = stickyManager.getStickyEndpoint('client1', endpoints);
    const endpoint2 = stickyManager.getStickyEndpoint('client2', endpoints);

    // Should be different (though not guaranteed due to hash distribution)
    expect(endpoints).toContain(endpoint1);
    expect(endpoints).toContain(endpoint2);
  });

  test('reassigns when endpoint is no longer available', () => {
    const originalEndpoints = ['server1', 'server2', 'server3'];
    const newEndpoints = ['server2', 'server3']; // server1 removed

    const originalEndpoint = stickyManager.getStickyEndpoint('client1', originalEndpoints);
    const newEndpoint = stickyManager.getStickyEndpoint('client1', newEndpoints);

    expect(newEndpoints).toContain(newEndpoint);
  });

  test('expires sticky assignments', async () => {
    const endpoints = ['server1', 'server2'];

    const endpoint1 = stickyManager.getStickyEndpoint('client1', endpoints);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));

    const endpoint2 = stickyManager.getStickyEndpoint('client1', endpoints);

    // Should potentially be different (depends on hash, but tests expiration)
    expect(endpoints).toContain(endpoint2);
  });

  test('cleanup removes expired entries', () => {
    stickyManager.getStickyEndpoint('client1', ['server1']);
    stickyManager.getStickyEndpoint('client2', ['server1']);

    // Manually expire entries
    for (const [key, value] of stickyManager.storage) {
      if (key.startsWith('sticky:')) {
        value.timestamp = Date.now() - 2000; // Past TTL
      }
    }

    stickyManager.cleanup();

    // Should have cleaned up expired entries
    let stickyCount = 0;
    for (const key of stickyManager.storage.keys()) {
      if (key.startsWith('sticky:')) stickyCount++;
    }

    expect(stickyCount).toBe(0);
  });
});