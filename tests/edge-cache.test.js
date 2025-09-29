const { EdgeCache } = require('../src/cache/edge');

describe('EdgeCache', () => {
  it('should initialize with platform', () => {
    const cache = new EdgeCache();
    expect(cache.platform).toBe('generic');
  });

  it('should return undefined for generic platform', async () => {
    const cache = new EdgeCache();
    const result = await cache.get('key');
    expect(result).toBeUndefined();
  });
});