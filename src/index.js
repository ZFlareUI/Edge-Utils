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

// Rate Limiting
const {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  RateLimitManager
} = require('./rate-limiting');

// Security
const {
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator,
  DDoSProtection
} = require('./security');

// Authentication & Authorization
const {
  JWTManager,
  APIKeyManager,
  EdgeSessionManager
} = require('./auth');

// Monitoring & Observability
const {
  MetricsCollector,
  StructuredLogger,
  TracingManager,
  HealthCheckManager
} = require('./monitoring');

// Load Balancing
const {
  LoadBalancer,
  CircuitBreaker,
  StickySessionManager
} = require('./load-balancing');

// Content Negotiation
const {
  ContentNegotiator,
  QualityValue,
  createContentNegotiationMiddleware
} = require('./content-negotiation');

// WebSocket
const {
  WebSocketManager,
  WebSocketUtils,
  WebSocketState,
  MessageType,
  createWebSocketMiddleware
} = require('./websocket');

// GraphQL
const {
  GraphQLClient,
  GraphQLError,
  GraphQLSchema,
  GraphQLQueryBuilder,
  createGraphQLMiddleware,
  OperationType,
  ErrorSeverity
} = require('./graphql');

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
  circuitBreaker,
  // Rate Limiting
  TokenBucketLimiter,
  SlidingWindowLimiter,
  RateLimitManager,
  // Security
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator,
  DDoSProtection,
  // Authentication & Authorization
  JWTManager,
  APIKeyManager,
  EdgeSessionManager,
  // Monitoring & Observability
  MetricsCollector,
  StructuredLogger,
  TracingManager,
  HealthCheckManager,
  // Load Balancing
  LoadBalancer,
  CircuitBreaker,
  StickySessionManager,
  // Content Negotiation
  ContentNegotiator,
  QualityValue,
  createContentNegotiationMiddleware,
  // WebSocket
  WebSocketManager,
  WebSocketUtils,
  WebSocketState,
  MessageType,
  createWebSocketMiddleware,
  // GraphQL
  GraphQLClient,
  GraphQLError,
  GraphQLSchema,
  GraphQLQueryBuilder,
  createGraphQLMiddleware,
  OperationType,
  ErrorSeverity
};