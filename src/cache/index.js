/**
 * Advanced Cache Module for Edge Computing
 * @module edge-utils/cache
 */

const { MemoryCache } = require('./memory');
const { EdgeCache } = require('./edge');
const {
  CacheAsidePattern,
  WriteThroughPattern,
  WriteBehindPattern,
  LRUCache,
  PriorityCacheWarmer,
  DistributedCacheCoordinator,
  CacheMetricsCollector,
  cacheWarming,
  cacheInvalidation
} = require('./strategies');

module.exports = {
  MemoryCache,
  EdgeCache,
  CacheAsidePattern,
  WriteThroughPattern,
  WriteBehindPattern,
  LRUCache,
  PriorityCacheWarmer,
  DistributedCacheCoordinator,
  CacheMetricsCollector,
  cacheWarming,
  cacheInvalidation
};