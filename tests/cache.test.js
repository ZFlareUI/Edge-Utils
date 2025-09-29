const { MemoryCache, detectPlatform } = require('../src/index');

describe('MemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new MemoryCache({ ttl: 1 }); // 1 second
  });

  test('should set and get values', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  test('should expire values', async () => {
    cache.set('key', 'value');
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(cache.get('key')).toBeUndefined();
  });

  test('should evict when max size reached', () => {
    const smallCache = new MemoryCache({ maxSize: 2 });
    smallCache.set('1', 'a');
    smallCache.set('2', 'b');
    smallCache.set('3', 'c');
    expect(smallCache.get('1')).toBeUndefined();
  });
});

describe('detectPlatform', () => {
  test('should detect generic platform', () => {
    expect(detectPlatform()).toBe('generic');
  });
});