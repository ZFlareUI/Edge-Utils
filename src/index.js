/**
 * edge-utils main entry point
 * @module edge-utils
 */
const { createEdgeHandler } = require('./core/handler');
const { detectPlatform, isCloudflareWorker, isVercelEdge } = require('./core/platform');
const { MemoryCache } = require('./cache/memory');
const { EdgeCache } = require('./cache/edge');
const { cacheWarming, cacheInvalidation } = require('./cache/strategies');
const { geoRoute, getCountry } = require('./geo/routing');
const { getRegion } = require('./geo/detection');
const { nearestRegion, nearestRegionByDistance } = require('./geo/nearest');
const { minimizeColdStart, keepAlive } = require('./performance/cold-start');
const { streamResponse, generateStream, createReadableStream } = require('./performance/streaming');
const { compressGzip, compressBrotli } = require('./performance/compression');
const { EdgeError, handleError, retryWithBackoff, circuitBreaker } = require('./errors');

module.exports = {
  createEdgeHandler,
  detectPlatform,
  isCloudflareWorker,
  isVercelEdge,
  MemoryCache,
  EdgeCache,
  cacheWarming,
  cacheInvalidation,
  geoRoute,
  getCountry,
  getRegion,
  nearestRegion,
  nearestRegionByDistance,
  minimizeColdStart,
  keepAlive,
  streamResponse,
  generateStream,
  createReadableStream,
  compressGzip,
  compressBrotli,
  EdgeError,
  handleError,
  retryWithBackoff,
  circuitBreaker
};