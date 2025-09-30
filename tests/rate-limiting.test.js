/**
 * Rate Limiting Tests
 * @je  test('refills tokens over time', async () => {
    const limiter = new TokenBucketLimiter({ refillRate: 10, capacity: 100 });
    const key = 'test-key';

    // Use up most tokens
    for (let i = 0; i < 9; i++) {
      await limiter.check(key, 10);
    }

    // Wait for some refill
    await new Promise(resolve => setTimeout(resolve, 600)); // Wait 0.6 seconds

    const allowed = await limiter.check(key, 5); // Should have refilled enough
    expect(allowed).toBe(true);
  });node
 */

const { TokenBucketLimiter, SlidingWindowLimiter, RateLimitManager } = require('../src/rate-limiting');

describe('TokenBucketLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new TokenBucketLimiter({
      refillRate: 10, // 10 tokens per second
      capacity: 100
    });
  });

  test('allows requests within capacity', async () => {
    const allowed = await limiter.check('test-key', 1);
    expect(allowed).toBe(true);
  });

  test('blocks requests exceeding capacity', async () => {
    // Use up all tokens
    for (let i = 0; i < 100; i++) {
      await limiter.check('test-key', 1);
    }

    // Next request should be blocked
    const allowed = await limiter.check('test-key', 1);
    expect(allowed).toBe(false);
  });

  test('refills tokens over time', async () => {
    const limiter = new TokenBucketLimiter({ refillRate: 10, capacity: 100 });
    const key = 'test-key';

    // Use up all tokens
    for (let i = 0; i < 10; i++) {
      await limiter.check(key, 10);
    }

    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait 1.1 seconds

    const allowed = await limiter.check(key, 1);
    expect(allowed).toBe(true);
  });

  test('returns correct remaining tokens', async () => {
    await limiter.check('test-key', 50);
    const remaining = await limiter.remaining('test-key');
    expect(remaining).toBe(50);
  });

  test('returns correct reset time', async () => {
    const resetTime = await limiter.resetTime('test-key');
    expect(typeof resetTime).toBe('number');
  });
});

describe('SlidingWindowLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new SlidingWindowLimiter({
      windowSize: 60, // 1 minute
      maxRequests: 10
    });
  });

  test('allows requests within window limit', async () => {
    for (let i = 0; i < 10; i++) {
      const allowed = await limiter.check('test-key');
      expect(allowed).toBe(true);
    }
  });

  test('blocks requests exceeding window limit', async () => {
    // Fill the window
    for (let i = 0; i < 10; i++) {
      await limiter.check('test-key');
    }

    // Next request should be blocked
    const allowed = await limiter.check('test-key');
    expect(allowed).toBe(false);
  });

  test('returns correct remaining requests', async () => {
    await limiter.check('test-key');
    const remaining = await limiter.remaining('test-key');
    expect(remaining).toBe(9);
  });
});

describe('RateLimitManager', () => {
  let manager;

  beforeEach(() => {
    manager = new RateLimitManager();
    manager.addStrategy('test', {
      type: 'token-bucket',
      refillRate: 10,
      capacity: 100
    });
  });

  test('allows requests with valid strategy', async () => {
    const result = await manager.check({ headers: {} }, { strategy: 'test' });
    expect(result.allowed).toBe(true);
    expect(result.headers).toHaveProperty('X-RateLimit-Limit');
    expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
    expect(result.headers).toHaveProperty('X-RateLimit-Reset');
  });

  test('blocks requests when limit exceeded', async () => {
    const manager = new RateLimitManager({ storage: new Map() });
    manager.addStrategy('test', { type: 'token-bucket', capacity: 2, refillRate: 1 });

    const mockRequest = { headers: { 'cf-connecting-ip': '127.0.0.1' } };

    // First request - allowed
    const result1 = await manager.check(mockRequest, { strategy: 'test', by: 'ip' });
    expect(result1.allowed).toBe(true);

    // Second request - allowed
    const result2 = await manager.check(mockRequest, { strategy: 'test', by: 'ip' });
    expect(result2.allowed).toBe(true);

    // Third request - blocked
    const result3 = await manager.check(mockRequest, { strategy: 'test', by: 'ip' });
    expect(result3.allowed).toBe(false);
  });

  test('handles exemptions', async () => {
    manager.exemptions.add('127.0.0.1');

    const result = await manager.check({
      headers: { 'x-forwarded-for': '127.0.0.1' }
    }, { strategy: 'test', by: 'ip' });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });

  test('handles whitelisting', async () => {
    manager.whitelist.add('127.0.0.1');

    const result = await manager.check({
      headers: { 'x-forwarded-for': '127.0.0.1' }
    }, { strategy: 'test', by: 'ip' });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });
});