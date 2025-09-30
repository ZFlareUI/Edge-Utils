/**
 * Rate Limiting System for Edge Computing
 * @module edge-utils/rate-limiting
 */

const crypto = require('crypto');

/**
 * Token Bucket Rate Limiter
 * Implements the token bucket algorithm for rate limiting
 */
class TokenBucketLimiter {
  constructor(options = {}) {
    this.refillRate = options.refillRate || 10; // tokens per second
    this.capacity = options.capacity || 100; // max tokens
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.storage = options.storage || new Map(); // fallback storage
  }

  /**
   * Refill tokens based on elapsed time
   * @private
   */
  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = Math.floor(elapsed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Check if request can proceed
   * @param {string} key - Rate limit key
   * @param {number} cost - Token cost (default: 1)
   * @returns {Promise<boolean>} - True if allowed
   */
  async check(key, cost = 1) {
    const state = await this._getState(key);
    this._refillState(state);

    if (state.tokens >= cost) {
      state.tokens -= cost;
      await this._setState(key, state);
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for key
   * @param {string} key - Rate limit key
   * @returns {Promise<number>} - Remaining tokens
   */
  async remaining(key) {
    const state = await this._getState(key);
    this._refillState(state);
    return Math.max(0, state.tokens);
  }

  /**
   * Get reset time for key
   * @param {string} key - Rate limit key
   * @returns {Promise<number>} - Reset timestamp
   */
  async resetTime(key) {
    const state = await this._getState(key);
    const timeToRefill = (this.capacity - state.tokens) / this.refillRate;
    return Math.ceil(state.lastRefill / 1000 + timeToRefill);
  }

  /**
   * Get state from storage
   * @private
   * @param {string} key
   * @returns {Promise<Object>}
   */
  async _getState(key) {
    try {
      const stored = await this.storage.get?.(`ratelimit:${key}`) ||
                     this.storage.get(`ratelimit:${key}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Storage unavailable, use in-memory fallback
    }

    return {
      tokens: this.capacity,
      lastRefill: Date.now()
    };
  }

  /**
   * Set state in storage
   * @private
   * @param {string} key
   * @param {Object} state
   */
  async _setState(key, state) {
    try {
      const value = JSON.stringify(state);
      await this.storage.put?.(`ratelimit:${key}`, value) ||
             this.storage.set(`ratelimit:${key}`, value);
    } catch (e) {
      // Storage unavailable, state not persisted
    }
  }

  /**
   * Refill tokens for a state object
   * @private
   * @param {Object} state
   */
  _refillState(state) {
    const now = Date.now();
    const elapsed = (now - state.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * this.refillRate);

    if (tokensToAdd > 0) {
      state.tokens = Math.min(this.capacity, state.tokens + tokensToAdd);
      state.lastRefill = now;
    }
  }
}

/**
 * Sliding Window Rate Limiter
 * Uses sorted sets for precise window tracking
 */
class SlidingWindowLimiter {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60; // seconds
    this.maxRequests = options.maxRequests || 100;
    this.storage = options.storage || new Map();
  }

  /**
   * Check if request can proceed
   * @param {string} key - Rate limit key
   * @returns {Promise<boolean>}
   */
  async check(key) {
    const now = Date.now();
    const windowStart = now - (this.windowSize * 1000);

    try {
      // Clean old entries
      await this._cleanup(key, windowStart);

      // Count current requests in window
      const count = await this._count(key, windowStart);

      if (count >= this.maxRequests) {
        return false;
      }

      // Add current request
      await this._add(key, now);
      return true;

    } catch (e) {
      // Storage unavailable, allow request
      return true;
    }
  }

  /**
   * Get remaining requests for key
   * @param {string} key
   * @returns {Promise<number>}
   */
  async remaining(key) {
    const now = Date.now();
    const windowStart = now - (this.windowSize * 1000);

    try {
      const count = await this._count(key, windowStart);
      return Math.max(0, this.maxRequests - count);
    } catch (e) {
      return this.maxRequests;
    }
  }

  /**
   * Get reset time for key
   * @param {string} key
   * @returns {Promise<number>}
   */
  async resetTime(key) {
    try {
      const timestamps = await this._getTimestamps(key);
      if (timestamps.length === 0) return Math.ceil(Date.now() / 1000);

      const oldest = Math.min(...timestamps);
      return Math.ceil((oldest + (this.windowSize * 1000)) / 1000);
    } catch (e) {
      return Math.ceil(Date.now() / 1000 + this.windowSize);
    }
  }

  /**
   * Clean up old entries
   * @private
   * @param {string} key
   * @param {number} windowStart
   */
  async _cleanup(key, windowStart) {
    const timestamps = await this._getTimestamps(key);
    const validTimestamps = timestamps.filter(t => t >= windowStart);
    await this._setTimestamps(key, validTimestamps);
  }

  /**
   * Count requests in window
   * @private
   * @param {string} key
   * @param {number} windowStart
   * @returns {Promise<number>}
   */
  async _count(key, windowStart) {
    const timestamps = await this._getTimestamps(key);
    return timestamps.filter(t => t >= windowStart).length;
  }

  /**
   * Add timestamp
   * @private
   * @param {string} key
   * @param {number} timestamp
   */
  async _add(key, timestamp) {
    const timestamps = await this._getTimestamps(key);
    timestamps.push(timestamp);
    await this._setTimestamps(key, timestamps);
  }

  /**
   * Get timestamps from storage
   * @private
   * @param {string} key
   * @returns {Promise<number[]>}
   */
  async _getTimestamps(key) {
    try {
      const stored = await this.storage.get?.(`ratelimit:${key}`) ||
                     this.storage.get(`ratelimit:${key}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Set timestamps in storage
   * @private
   * @param {string} key
   * @param {number[]} timestamps
   */
  async _setTimestamps(key, timestamps) {
    try {
      const value = JSON.stringify(timestamps);
      await this.storage.put?.(`ratelimit:${key}`, value) ||
             this.storage.set(`ratelimit:${key}`, value);
    } catch (e) {
      // Storage unavailable
    }
  }
}

/**
 * Rate Limit Manager
 * Orchestrates different rate limiting strategies
 */
class RateLimitManager {
  constructor(options = {}) {
    this.strategies = new Map();
    this.storage = options.storage;
    this.defaultStrategy = options.defaultStrategy || 'token-bucket';
    this.exemptions = new Set(options.exemptions || []);
    this.whitelist = new Set(options.whitelist || []);
  }

  /**
   * Add a rate limit strategy
   * @param {string} name
   * @param {Object} config
   */
  addStrategy(name, config) {
    const { type, ...options } = config;
    options.storage = this.storage;

    switch (type) {
      case 'token-bucket':
        this.strategies.set(name, new TokenBucketLimiter(options));
        break;
      case 'sliding-window':
        this.strategies.set(name, new SlidingWindowLimiter(options));
        break;
      default:
        throw new Error(`Unknown rate limit type: ${type}`);
    }
  }

  /**
   * Check rate limit for a request
   * @param {Object} request
   * @param {Object} options
   * @returns {Promise<Object>} - { allowed, remaining, resetTime, headers }
   */
  async check(request, options = {}) {
    // Check exemptions and whitelist before generating key
    const rawKey = options.by === 'ip' ? this._getClientIP(request) :
                   options.by === 'api-key' ? (request.headers?.['x-api-key'] || 'anonymous') :
                   options.by === 'user' ? (request.user?.id || 'anonymous') : 'global';

    if (this.exemptions.has(rawKey) || this.whitelist.has(rawKey)) {
      return { allowed: true, remaining: -1, resetTime: -1, headers: {} };
    }

    const key = this._generateKey(request, options);
    const strategy = options.strategy || this.defaultStrategy;

    const limiter = this.strategies.get(strategy);
    if (!limiter) {
      throw new Error(`Rate limit strategy not found: ${strategy}`);
    }

    const allowed = await limiter.check(key);
    const remaining = await limiter.remaining(key);
    const resetTime = await limiter.resetTime(key);

    const headers = {
      'X-RateLimit-Limit': options.limit || limiter.capacity || limiter.maxRequests,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': resetTime
    };

    return { allowed, remaining, resetTime, headers };
  }

  /**
   * Generate rate limit key
   * @private
   * @param {Object} request
   * @param {Object} options
   * @returns {string}
   */
  _generateKey(request, options) {
    const parts = [];

    if (options.by === 'ip') {
      parts.push(this._getClientIP(request));
    } else if (options.by === 'api-key') {
      parts.push(request.headers?.['x-api-key'] || 'anonymous');
    } else if (options.by === 'user') {
      parts.push(request.user?.id || 'anonymous');
    } else if (options.by === 'composite') {
      parts.push(this._getClientIP(request));
      parts.push(request.method);
      parts.push(request.url?.pathname || '/');
    } else {
      // Global
      parts.push('global');
    }

    return crypto.createHash('sha256').update(parts.join(':')).digest('hex');
  }

  /**
   * Extract client IP from request
   * @private
   * @param {Object} request
   * @returns {string}
   */
  _getClientIP(request) {
    return request.headers?.['cf-connecting-ip'] ||
           request.headers?.['x-forwarded-for']?.split(',')[0] ||
           request.headers?.['x-real-ip'] ||
           '127.0.0.1';
  }

  /**
   * Middleware for rate limiting
   * @param {Object} options
   * @returns {Function}
   */
  middleware(options = {}) {
    return async (request, context) => {
      const result = await this.check(request, options);

      if (!result.allowed) {
        const retryAfter = Math.max(1, result.resetTime - Math.floor(Date.now() / 1000));
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            ...result.headers,
            'Retry-After': retryAfter.toString(),
            'Content-Type': 'text/plain'
          }
        });
      }

      // Add headers to response
      context.rateLimitHeaders = result.headers;
      return null; // Continue to next middleware
    };
  }
}

module.exports = {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  RateLimitManager
};