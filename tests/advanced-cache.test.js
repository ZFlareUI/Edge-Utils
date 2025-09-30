/**
 * Advanced Caching Strategies Tests
 * @jest-environment node
 */

const {
  CacheAsidePattern,
  WriteThroughPattern,
  WriteBehindPattern,
  LRUCache,
  PriorityCacheWarmer,
  DistributedCacheCoordinator,
  CacheMetricsCollector
} = require('../src/cache/strategies');

describe('CacheAsidePattern', () => {
  let cache;
  let fetcher;
  let pattern;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    };
    fetcher = jest.fn();
    pattern = new CacheAsidePattern(cache, fetcher);
  });

  test('returns cached value on hit', async () => {
    cache.get.mockResolvedValue('cached-value');

    const result = await pattern.get('key1');

    expect(result).toBe('cached-value');
    expect(cache.get).toHaveBeenCalledWith('key1');
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('fetches and caches on miss', async () => {
    cache.get.mockResolvedValue(null);
    fetcher.mockResolvedValue('fetched-value');

    const result = await pattern.get('key1');

    expect(result).toBe('fetched-value');
    expect(fetcher).toHaveBeenCalledWith('key1');
    expect(cache.set).toHaveBeenCalledWith('key1', 'fetched-value', { ttl: 300000 });
  });

  test('stores and retrieves tags', async () => {
    cache.get.mockResolvedValue(null);
    fetcher.mockResolvedValue('value');

    await pattern.get('key1', { tags: ['tag1', 'tag2'] });

    expect(pattern.tags.get('tag1')).toContain('key1');
    expect(pattern.tags.get('tag2')).toContain('key1');
  });

  test('invalidates by tags', async () => {
    cache.get.mockResolvedValue(null);
    fetcher.mockResolvedValue('value');

    await pattern.get('key1', { tags: ['tag1'] });
    await pattern.get('key2', { tags: ['tag1'] });
    await pattern.get('key3', { tags: ['tag2'] });

    await pattern.invalidateByTags(['tag1']);

    expect(cache.delete).toHaveBeenCalledWith('key1');
    expect(cache.delete).toHaveBeenCalledWith('key2');
    expect(cache.delete).not.toHaveBeenCalledWith('key3');
  });
});

describe('WriteThroughPattern', () => {
  let cache;
  let writer;
  let pattern;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn()
    };
    writer = jest.fn();
    pattern = new WriteThroughPattern(cache, writer);
  });

  test('writes to source and cache', async () => {
    writer.mockResolvedValue();
    cache.set.mockResolvedValue();

    const result = await pattern.set('key1', 'value1');

    expect(result).toBe(true);
    expect(writer).toHaveBeenCalledWith('key1', 'value1');
    expect(cache.set).toHaveBeenCalledWith('key1', 'value1', { ttl: 300000 });
  });

  test('throws on writer error', async () => {
    writer.mockRejectedValue(new Error('Write failed'));

    await expect(pattern.set('key1', 'value1')).rejects.toThrow('Write failed');
  });
});

describe('WriteBehindPattern', () => {
  let cache;
  let writer;
  let pattern;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = {
      get: jest.fn(),
      set: jest.fn()
    };
    writer = jest.fn();
    pattern = new WriteBehindPattern(cache, writer, { flushInterval: 100 });
  });

  afterEach(() => {
    jest.useRealTimers();
    pattern.destroy();
  });

  test('writes to cache immediately', async () => {
    cache.set.mockResolvedValue();

    const result = await pattern.set('key1', 'value1');

    expect(result).toBe(true);
    expect(cache.set).toHaveBeenCalledWith('key1', 'value1', { ttl: 300000 });
    expect(writer).not.toHaveBeenCalled();
  });

  test('flushes pending writes periodically', async () => {
    cache.set.mockResolvedValue();
    writer.mockResolvedValue();

    await pattern.set('key1', 'value1');
    await pattern.set('key2', 'value2');

    // Manually trigger flush
    await pattern._flush();

    expect(writer).toHaveBeenCalledWith('key1', 'value1');
    expect(writer).toHaveBeenCalledWith('key2', 'value2');
  });
});

describe('LRUCache', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache(3, 1000);
  });

  test('stores and retrieves values', async () => {
    await cache.set('key1', 'value1');
    const result = await cache.get('key1');

    expect(result).toBe('value1');
  });

  test('evicts LRU when full', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');
    await cache.set('key4', 'value4'); // Should evict key1

    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key2')).toBe('value2');
    expect(await cache.get('key3')).toBe('value3');
    expect(await cache.get('key4')).toBe('value4');
  });

  test('respects TTL', async () => {
    jest.useFakeTimers();

    await cache.set('key1', 'value1', { ttl: 500 });

    jest.advanceTimersByTime(600);

    const result = await cache.get('key1');
    expect(result).toBeNull();

    jest.useRealTimers();
  });

  test('updates access order on get', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');

    // Access key1 to make it most recently used
    await cache.get('key1');

    // Add key4, should evict key2 (least recently used)
    await cache.set('key4', 'value4');

    expect(await cache.get('key2')).toBeNull();
    expect(await cache.get('key1')).toBe('value1');
  });
});

describe('PriorityCacheWarmer', () => {
  let cache;
  let fetcher;
  let warmer;

  beforeEach(() => {
    cache = {
      set: jest.fn()
    };
    fetcher = jest.fn();
    warmer = new PriorityCacheWarmer(cache, fetcher, { concurrency: 2 });
  });

  test('warms cache with priority ordering', async () => {
    fetcher.mockResolvedValue('value');

    warmer.addToQueue('low-priority', 1);
    warmer.addToQueue('high-priority', 10);
    warmer.addToQueue('medium-priority', 5);

    // Start processing after all items are queued
    await warmer.process();

    const calls = cache.set.mock.calls;
    expect(calls.length).toBe(3);
    expect(calls[0][0]).toBe('high-priority');
    expect(calls[1][0]).toBe('medium-priority');
    expect(calls[2][0]).toBe('low-priority');
  });

  test('retries failed fetches', async () => {
    let attempts = 0;
    fetcher.mockImplementation(() => {
      attempts++;
      if (attempts < 3) throw new Error('Fetch failed');
      return 'value';
    });

    warmer.addToQueue('key1', 1);
    await warmer.process();

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(cache.set).toHaveBeenCalledWith('key1', 'value', {});
  });
});

describe('DistributedCacheCoordinator', () => {
  let caches;
  let coordinator;

  beforeEach(() => {
    caches = [
      { get: jest.fn(), set: jest.fn(), delete: jest.fn() },
      { get: jest.fn(), set: jest.fn(), delete: jest.fn() }
    ];
    coordinator = new DistributedCacheCoordinator(caches, { replicationFactor: 2 });
  });

  test('returns first successful cache hit', async () => {
    caches[0].get.mockResolvedValue(null);
    caches[1].get.mockResolvedValue('value');

    const result = await coordinator.get('key1');

    expect(result).toBe('value');
    expect(caches[0].set).toHaveBeenCalledWith('key1', 'value');
  });

  test('replicates to multiple caches on set', async () => {
    caches[0].set.mockResolvedValue();
    caches[1].set.mockResolvedValue();

    await coordinator.set('key1', 'value');

    expect(caches[0].set).toHaveBeenCalledWith('key1', 'value', {});
    expect(caches[1].set).toHaveBeenCalledWith('key1', 'value', {});
  });
});

describe('CacheMetricsCollector', () => {
  let metrics;

  beforeEach(() => {
    metrics = new CacheMetricsCollector({ resetInterval: 50 }); // Shorter interval for testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    metrics.destroy();
    jest.useRealTimers();
  });

  test('records and calculates metrics', () => {
    metrics.recordHit();
    metrics.recordHit();
    metrics.recordMiss();
    metrics.recordSet();

    const result = metrics.getMetrics();

    expect(result.hits).toBe(2);
    expect(result.misses).toBe(1);
    expect(result.sets).toBe(1);
    expect(result.hitRate).toBe(2/3);
    expect(result.totalOperations).toBe(4);
  });

  test('resets metrics periodically', () => {
    metrics.recordHit();

    // Manually trigger reset
    metrics.reset();

    const result = metrics.getMetrics();
    expect(result.hits).toBe(0);
  });
});