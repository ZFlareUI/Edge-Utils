/**
 * Monitoring & Observability Module for Edge Computing
 * @module edge-utils/monitoring
 */

const crypto = require('crypto');

/**
 * Metrics Collector
 * Collects and aggregates performance metrics
 */
class MetricsCollector {
  constructor(options = {}) {
    this.metrics = new Map();
    this.histograms = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.storage = options.storage;
    this.flushInterval = options.flushInterval || 60000; // 1 minute
    this.retentionPeriod = options.retentionPeriod || 24 * 60 * 60 * 1000; // 24 hours

    // Start periodic flush
    if (options.autoFlush !== false) {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  /**
   * Increment counter
   * @param {string} name
   * @param {number} value
   * @param {Object} tags
   */
  increment(name, value = 1, tags = {}) {
    const key = this._getKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set gauge value
   * @param {string} name
   * @param {number} value
   * @param {Object} tags
   */
  gauge(name, value, tags = {}) {
    const key = this._getKey(name, tags);
    this.gauges.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Record histogram value
   * @param {string} name
   * @param {number} value
   * @param {Object} tags
   */
  histogram(name, value, tags = {}) {
    const key = this._getKey(name, tags);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key).push({ value, timestamp: Date.now() });
  }

  /**
   * Record timing
   * @param {string} name
   * @param {number} startTime
   * @param {Object} tags
   */
  timing(name, startTime, tags = {}) {
    const duration = Date.now() - startTime;
    this.histogram(name, duration, tags);
  }

  /**
   * Get counter value
   * @param {string} name
   * @param {Object} tags
   * @returns {number}
   */
  getCounter(name, tags = {}) {
    const key = this._getKey(name, tags);
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   * @param {string} name
   * @param {Object} tags
   * @returns {number|null}
   */
  getGauge(name, tags = {}) {
    const key = this._getKey(name, tags);
    const gauge = this.gauges.get(key);
    return gauge ? gauge.value : null;
  }

  /**
   * Get histogram percentiles
   * @param {string} name
   * @param {Object} tags
   * @param {number[]} percentiles
   * @returns {Object}
   */
  getHistogramPercentiles(name, tags = {}, percentiles = [50, 95, 99, 99.9]) {
    const key = this._getKey(name, tags);
    const values = this.histograms.get(key) || [];
    if (values.length === 0) return {};

    const sorted = values.map(v => v.value).sort((a, b) => a - b);
    const result = {};

    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    }

    return result;
  }

  /**
   * Get all metrics
   * @returns {Object}
   */
  getAllMetrics() {
    const result = {
      counters: {},
      gauges: {},
      histograms: {}
    };

    // Counters
    for (const [key, value] of this.counters) {
      result.counters[key] = value;
    }

    // Gauges
    for (const [key, gauge] of this.gauges) {
      result.gauges[key] = gauge.value;
    }

    // Histograms
    for (const [key, values] of this.histograms) {
      result.histograms[key] = this.getHistogramPercentiles(key.split(':')[0], this._parseTags(key));
    }

    return result;
  }

  /**
   * Flush metrics to storage
   */
  async flush() {
    const metrics = this.getAllMetrics();
    const timestamp = Date.now();

    try {
      const key = `metrics:${timestamp}`;
      await this.storage?.put?.(key, JSON.stringify(metrics)) ||
             this.storage?.set?.(key, JSON.stringify(metrics));
    } catch (e) {
      // Storage unavailable
    }

    // Clean up old data
    this._cleanup();
  }

  /**
   * Create key from name and tags
   * @private
   * @param {string} name
   * @param {Object} tags
   * @returns {string}
   */
  _getKey(name, tags) {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagString ? `${name}:{${tagString}}` : name;
  }

  /**
   * Parse tags from key
   * @private
   * @param {string} key
   * @returns {Object}
   */
  _parseTags(key) {
    const match = key.match(/{(.+)}/);
    if (!match) return {};

    const tags = {};
    match[1].split(',').forEach(tag => {
      const [k, v] = tag.split('=');
      tags[k] = v;
    });
    return tags;
  }

  /**
   * Clean up old histogram data
   * @private
   */
  _cleanup() {
    const cutoff = Date.now() - this.retentionPeriod;

    for (const [key, values] of this.histograms) {
      const filtered = values.filter(v => v.timestamp > cutoff);
      if (filtered.length === 0) {
        this.histograms.delete(key);
      } else {
        this.histograms.set(key, filtered);
      }
    }
  }
}

/**
 * Structured Logger
 * Provides consistent JSON logging with multiple levels
 */
class StructuredLogger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.format = options.format || 'json';
    this.sampling = options.sampling || {};
    this.redaction = options.redaction || [];
    this.aggregation = options.aggregation || {};
    this.forceConsoleLog = options.forceConsoleLog !== false; // Default to true for compatibility
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
  }

  /**
   * Log debug message
   * @param {string} message
   * @param {Object} context
   */
  debug(message, context = {}) {
    this._log('debug', message, context);
  }

  /**
   * Log info message
   * @param {string} message
   * @param {Object} context
   */
  info(message, context = {}) {
    this._log('info', message, context);
  }

  /**
   * Log warning message
   * @param {string} message
   * @param {Object} context
   */
  warn(message, context = {}) {
    this._log('warn', message, context);
  }

  /**
   * Log error message
   * @param {string} message
   * @param {Object} context
   */
  error(message, context = {}) {
    this._log('error', message, context);
  }

  /**
   * Log fatal message
   * @param {string} message
   * @param {Object} context
   */
  fatal(message, context = {}) {
    this._log('fatal', message, context);
  }

  /**
   * Create child logger with additional context
   * @param {Object} context
   * @returns {StructuredLogger}
   */
  child(context = {}) {
    const childLogger = new StructuredLogger({
      level: this.level,
      format: this.format,
      sampling: this.sampling,
      redaction: this.redaction,
      aggregation: this.aggregation
    });

    childLogger._baseContext = { ...this._baseContext, ...context };
    return childLogger;
  }

  /**
   * Internal logging method
   * @private
   * @param {string} level
   * @param {string} message
   * @param {Object} context
   */
  _log(level, message, context = {}) {
    if (this.levels[level] < this.levels[this.level]) {
      return;
    }

    // Sampling
    if (this._shouldSample(level, context)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this._baseContext,
      ...this._redact(context)
    };

    // Add request ID if available
    if (context.requestId) {
      logEntry.requestId = context.requestId;
    }

    // Add trace ID if available
    if (context.traceId) {
      logEntry.traceId = context.traceId;
    }

    // Format and output
    const formatted = this._format(logEntry);
    
    // Always use console.log for testing/development compatibility
    // In production, set forceConsoleLog: false and implement custom handler
    if (this.forceConsoleLog) {
      console.log(formatted);
    } else if (typeof process !== 'undefined' && process.stderr) {
      // Node.js environment with explicit process output
      if (level === 'error' || level === 'fatal') {
        process.stderr.write(formatted + '\n');
      } else {
        process.stdout.write(formatted + '\n');
      }
    } else {
      // Browser or edge runtime fallback
      console.log(formatted);
    }

    // Aggregation
    this._aggregate(logEntry);
  }

  /**
   * Check if log should be sampled
   * @private
   * @param {string} level
   * @param {Object} context
   * @returns {boolean}
   */
  _shouldSample(level, context) {
    const sampleRate = this.sampling[level];
    if (!sampleRate || sampleRate >= 1) return false;

    const hash = crypto.createHash('md5')
      .update(`${level}:${JSON.stringify(context)}`)
      .digest('hex');

    const sample = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
    return sample > sampleRate;
  }

  /**
   * Redact sensitive data
   * @private
   * @param {Object} context
   * @returns {Object}
   */
  _redact(context) {
    const redacted = { ...context };

    for (const field of this.redaction) {
      if (redacted[field]) {
        if (field.toLowerCase().includes('password') ||
            field.toLowerCase().includes('secret') ||
            field.toLowerCase().includes('token')) {
          redacted[field] = '[REDACTED]';
        } else if (field.toLowerCase().includes('email')) {
          redacted[field] = redacted[field].replace(/(.{2}).*(@.*)/, '$1***$2');
        } else if (field.toLowerCase().includes('ip')) {
          redacted[field] = redacted[field].replace(/(\d+\.\d+\.\d+)\.\d+/, '$1.***');
        }
      }
    }

    return redacted;
  }

  /**
   * Format log entry
   * @private
   * @param {Object} entry
   * @returns {string}
   */
  _format(entry) {
    if (this.format === 'json') {
      return JSON.stringify(entry);
    } else {
      return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
    }
  }

  /**
   * Aggregate log entries
   * @private
   * @param {Object} entry
   */
  _aggregate(entry) {
    // Simple aggregation - count occurrences
    const key = `${entry.level}:${entry.message}`;
    if (!this.aggregation[key]) {
      this.aggregation[key] = { count: 0, firstSeen: entry.timestamp };
    }
    this.aggregation[key].count++;
    this.aggregation[key].lastSeen = entry.timestamp;
  }

  /**
   * Get aggregation stats
   * @returns {Object}
   */
  getAggregationStats() {
    return { ...this.aggregation };
  }
}

/**
 * Distributed Tracing Manager
 * Implements W3C Trace Context and span management
 */
class TracingManager {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'edge-service';
    this.sampler = options.sampler || (() => Math.random() < 0.1); // 10% sampling
    this.exporter = options.exporter;
    this.spans = new Map();
    this.activeSpans = new Map();
  }

  /**
   * Extract trace context from headers
   * @param {Object} headers
   * @returns {Object|null}
   */
  extract(headers) {
    const traceparent = headers?.['traceparent'];
    const tracestate = headers?.['tracestate'];

    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    return {
      version: parts[0],
      traceId: parts[1],
      parentId: parts[2],
      flags: parts[3],
      state: tracestate
    };
  }

  /**
   * Inject trace context into headers
   * @param {Object} context
   * @param {Object} headers
   */
  inject(context, headers) {
    if (!context) return;

    headers['traceparent'] = `${context.version}-${context.traceId}-${context.spanId}-${context.flags}`;
    if (context.state) {
      headers['tracestate'] = context.state;
    }
  }

  /**
   * Start a new span
   * @param {string} name
   * @param {Object} parentContext
   * @param {Object} attributes
   * @returns {Object} - Span context
   */
  startSpan(name, parentContext = null, attributes = {}) {
    const traceId = parentContext?.traceId || this._generateTraceId();
    const spanId = this._generateSpanId();
    const parentId = parentContext?.spanId;

    const span = {
      traceId,
      spanId,
      parentId,
      name,
      startTime: Date.now(),
      attributes,
      events: []
    };

    // Sampling decision
    const sampled = parentContext ? parentContext.sampled : this.sampler();
    span.sampled = sampled;

    this.spans.set(spanId, span);
    this.activeSpans.set(spanId, span);

    return {
      traceId,
      spanId,
      parentId,
      sampled,
      flags: sampled ? '01' : '00',
      version: '00'
    };
  }

  /**
   * End a span
   * @param {string} spanId
   * @param {Object} attributes
   */
  endSpan(spanId, attributes = {}) {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    Object.assign(span.attributes, attributes);

    this.activeSpans.delete(spanId);

    // Export if sampled
    if (span.sampled && this.exporter) {
      this.exporter.export(span);
    }
  }

  /**
   * Add event to span
   * @param {string} spanId
   * @param {string} name
   * @param {Object} attributes
   */
  addEvent(spanId, name, attributes = {}) {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
  }

  /**
   * Set span attributes
   * @param {string} spanId
   * @param {Object} attributes
   */
  setAttributes(spanId, attributes) {
    const span = this.spans.get(spanId);
    if (!span) return;

    Object.assign(span.attributes, attributes);
  }

  /**
   * Get active span
   * @returns {Object|null}
   */
  getActiveSpan() {
    const spans = Array.from(this.activeSpans.values());
    return spans[spans.length - 1] || null;
  }

  /**
   * Generate trace ID
   * @private
   * @returns {string}
   */
  _generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate span ID
   * @private
   * @returns {string}
   */
  _generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
  }
}

/**
 * Health Check Manager
 * Provides liveness and readiness endpoints
 */
class HealthCheckManager {
  constructor(options = {}) {
    this.checks = new Map();
    this.overallTimeout = options.timeout || 30000; // 30 seconds
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5000; // 5 seconds
  }

  /**
   * Add health check
   * @param {string} name
   * @param {Function} checkFn
   * @param {Object} options
   */
  addCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      timeout: options.timeout || 5000,
      critical: options.critical !== false,
      tags: options.tags || []
    });
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>}
   */
  async runChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      uptime: process.uptime?.() || 0
    };

    const checkPromises = [];

    for (const [name, check] of this.checks) {
      checkPromises.push({ name, promise: this._runCheck(name, check) });
    }

    const checkResults = await Promise.allSettled(checkPromises.map(cp => cp.promise));

    for (let i = 0; i < checkResults.length; i++) {
      const { name } = checkPromises[i];
      const result = checkResults[i];

      if (result.status === 'fulfilled') {
        results.checks[name] = result.value;
        if (!result.value.healthy && this.checks.get(name).critical) {
          results.status = 'unhealthy';
        }
      } else {
        results.checks[name] = {
          healthy: false,
          error: result.reason.message,
          duration: 0
        };
        results.status = 'unhealthy';
      }
    }

    return results;
  }

  /**
   * Get liveness status (always healthy if service is running)
   * @returns {Object}
   */
  getLiveness() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0
    };
  }

  /**
   * Get readiness status (full health check)
   * @returns {Promise<Object>}
   */
  async getReadiness() {
    // Use cached result if available
    const cached = this.cache.get('readiness');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    const result = await this.runChecks();
    this.cache.set('readiness', { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Run individual health check
   * @private
   * @param {string} name
   * @param {Object} check
   * @returns {Promise<Object>}
   */
  async _runCheck(name, check) {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        check.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), check.timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      if (typeof result === 'boolean') {
        return {
          healthy: result,
          duration
        };
      } else if (typeof result === 'object') {
        return {
          healthy: result.healthy !== false,
          duration,
          ...result
        };
      }

      return {
        healthy: true,
        duration
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Middleware for health endpoints
   * @returns {Function}
   */
  middleware() {
    return async (request, context) => {
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (pathname === '/health/live' || pathname === '/health/liveness') {
        const result = this.getLiveness();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (pathname === '/health/ready' || pathname === '/health/readiness') {
        const result = await this.getReadiness();
        const status = result.status === 'healthy' ? 200 : 503;
        return new Response(JSON.stringify(result), {
          status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return null;
    };
  }
}

module.exports = {
  MetricsCollector,
  StructuredLogger,
  TracingManager,
  HealthCheckManager
};