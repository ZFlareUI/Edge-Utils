/**
 * Caching strategies for edge environments
 * @module edge-utils/cache/strategies
 */
async function cacheWarming(cache, keys, fetcher) {
  const promises = keys.map(async key => {
    try {
      const value = await fetcher(key);
      await cache.set(key, value);
    } catch (error) {
      console.error(`Failed to warm cache for key ${key}:`, error);
    }
  });
  await Promise.all(promises);
}

function cacheInvalidation(cache, pattern) {
  // For in-memory cache
  if (cache.store && typeof cache.store.keys === 'function') {
    for (const key of cache.store.keys()) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  }
  // For edge cache, would need async deletion, but simplified here
}

module.exports = { cacheWarming, cacheInvalidation };