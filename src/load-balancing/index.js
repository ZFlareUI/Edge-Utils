/**
 * Load Balancing Module for Edge Computing
 * @module edge-utils/load-balancing
 */

const crypto = require('crypto');

/**
 * Load Balancer for distributing requests across multiple endpoints
 */
class LoadBalancer {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'round-robin';
    this.endpoints = new Map(); // endpoint -> health status
    this.weights = new Map(); // endpoint -> weight
    this.currentIndex = 0;
    this.requestCounts = new Map(); // endpoint -> request count
    this.responseTimes = new Map(); // endpoint -> average response time
    this.responseTimeCounts = new Map(); // endpoint -> number of response time samples
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.healthCheckUrl = options.healthCheckUrl || '/health';
    this.failureThreshold = options.failureThreshold || 3;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 5000;

    // ALTER algorithm specific properties
    this.performanceHistory = new Map(); // endpoint -> performance history
    this.historyWindow = options.historyWindow || 100; // Keep last 100 measurements
    this.adaptiveWeights = new Map(); // endpoint -> adaptive weight based on performance
    this.lastWeightUpdate = Date.now();
    this.weightUpdateInterval = options.weightUpdateInterval || 60000; // Update weights every minute

    // Start health checking
    if (options.endpoints) {
      this.setEndpoints(options.endpoints);
    }

    this.healthCheckTimer = setInterval(() => this._performHealthChecks(), this.healthCheckInterval);
  }

  /**
   * Set endpoints for load balancing
   * @param {Array} endpoints - Array of endpoint objects {url, weight}
   */
  setEndpoints(endpoints) {
    this.endpoints.clear();
    this.weights.clear();
    this.requestCounts.clear();
    this.responseTimes.clear();
    this.responseTimeCounts.clear();

    endpoints.forEach(endpoint => {
      this.endpoints.set(endpoint.url, { healthy: true, failures: 0, successes: 0 });
      this.weights.set(endpoint.url, endpoint.weight || 1);
      this.requestCounts.set(endpoint.url, 0);
      this.responseTimes.set(endpoint.url, 0);
      this.responseTimeCounts.set(endpoint.url, 0);
    });
  }

  /**
   * Get next endpoint using the configured algorithm
   * @returns {string|null} - Next endpoint URL
   */
  getNextEndpoint() {
    const healthyEndpoints = Array.from(this.endpoints.entries())
      .filter(([, status]) => status.healthy)
      .map(([url]) => url);

    if (healthyEndpoints.length === 0) {
      return null;
    }

    switch (this.algorithm) {
      case 'round-robin':
        return this._roundRobin(healthyEndpoints);
      case 'weighted-round-robin':
        return this._weightedRoundRobin(healthyEndpoints);
      case 'least-connections':
        return this._leastConnections(healthyEndpoints);
      case 'random':
        return this._random(healthyEndpoints);
      case 'ip-hash':
        return this._ipHash(healthyEndpoints);
      case 'alter':
        return this._alterAlgorithm(healthyEndpoints);
      default:
        return this._roundRobin(healthyEndpoints);
    }
  }

  /**
   * Record request start
   * @param {string} endpoint
   */
  recordRequestStart(endpoint) {
    this.requestCounts.set(endpoint, (this.requestCounts.get(endpoint) || 0) + 1);
  }

    /**
   * Record the end of a request and update metrics
   * @param {string} endpoint
   * @param {number} responseTime
   * @param {boolean} success
   */
  recordRequestEnd(endpoint, responseTime, success) {
    if (!this.endpoints.has(endpoint)) {
      return;
    }

    // Update request counts
    const currentCount = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, Math.max(0, currentCount - 1));

    // Update response time metrics
    const currentAvg = this.responseTimes.get(endpoint) || 0;
    const currentCountRT = this.responseTimeCounts.get(endpoint) || 0;
    const newCount = currentCountRT + 1;
    const newAvg = ((currentAvg * currentCountRT) + responseTime) / newCount;

    this.responseTimes.set(endpoint, newAvg);
    this.responseTimeCounts.set(endpoint, newCount);

    // Update success/failure counts
    const status = this.endpoints.get(endpoint);
    if (success) {
      status.successes++;
    } else {
      status.failures++;
    }

    // Record performance history for ALTER algorithm
    this._recordPerformanceHistory(endpoint, responseTime, success);

    // Update adaptive weights periodically (every 100 requests or 30 seconds)
    this._updateCounter++;
    if (this._updateCounter >= 100 || (Date.now() - this._lastWeightUpdate) > 30000) {
      this._updateAdaptiveWeights();
      this._updateCounter = 0;
      this._lastWeightUpdate = Date.now();
    }
  }

  /**
   * Get load balancer statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalEndpoints: this.endpoints.size,
      healthyEndpoints: 0,
      totalRequests: 0,
      algorithm: this.algorithm,
      endpoints: {}
    };

    for (const [url, status] of this.endpoints) {
      const isHealthy = status.healthy;
      if (isHealthy) stats.healthyEndpoints++;

      stats.totalRequests += this.requestCounts.get(url) || 0;

      stats.endpoints[url] = {
        healthy: isHealthy,
        weight: this.weights.get(url) || 1,
        activeRequests: this.requestCounts.get(url) || 0,
        averageResponseTime: this.responseTimes.get(url) || 0,
        failures: status.failures,
        successes: status.successes
      };
    }

    return stats;
  }

  /**
   * Destroy the load balancer
   */
  destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  _roundRobin(endpoints) {
    if (this.currentIndex >= endpoints.length) {
      this.currentIndex = 0;
    }
    return endpoints[this.currentIndex++];
  }

  _weightedRoundRobin(endpoints) {
    // Simple weighted round-robin implementation
    let totalWeight = 0;
    const weightedEndpoints = [];

    endpoints.forEach(endpoint => {
      const weight = this.weights.get(endpoint) || 1;
      totalWeight += weight;
      weightedEndpoints.push({ endpoint, weight });
    });

    if (totalWeight === 0) return endpoints[0];

    this.currentIndex = (this.currentIndex + 1) % totalWeight;

    let currentWeight = 0;
    for (const { endpoint, weight } of weightedEndpoints) {
      currentWeight += weight;
      if (this.currentIndex < currentWeight) {
        return endpoint;
      }
    }

    return endpoints[0];
  }

  _leastConnections(endpoints) {
    let minConnections = Infinity;
    let selectedEndpoint = endpoints[0];

    endpoints.forEach(endpoint => {
      const connections = this.requestCounts.get(endpoint) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedEndpoint = endpoint;
      }
    });

    return selectedEndpoint;
  }

  _random(endpoints) {
    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }

  _ipHash(endpoints, clientIP) {
    // Simple IP-based hashing for sticky sessions
    const hash = crypto.createHash('md5').update(clientIP || 'default').digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % endpoints.length;
    return endpoints[index];
  }

  /**
   * Record performance history for ALTER algorithm
   * @param {string} endpoint
   * @param {number} responseTime
   * @param {boolean} success
   */
  _recordPerformanceHistory(endpoint, responseTime, success) {
    if (!this.performanceHistory.has(endpoint)) {
      this.performanceHistory.set(endpoint, []);
    }

    const history = this.performanceHistory.get(endpoint);
    history.push({
      timestamp: Date.now(),
      responseTime,
      success,
      activeRequests: this.requestCounts.get(endpoint) || 0
    });

    // Keep only recent history
    if (history.length > this.historyWindow) {
      history.shift();
    }
  }

  /**
   * Update adaptive weights based on recent performance
   */
  _updateAdaptiveWeights() {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // Last 5 minutes

    for (const endpoint of this.endpoints.keys()) {
      const history = this.performanceHistory.get(endpoint) || [];
      const recentHistory = history.filter(h => now - h.timestamp < timeWindow);

      if (recentHistory.length === 0) {
        this.adaptiveWeights.set(endpoint, 1.0); // Default weight
        continue;
      }

      // Calculate performance metrics
      const avgResponseTime = recentHistory.reduce((sum, h) => sum + h.responseTime, 0) / recentHistory.length;
      const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;
      const avgLoad = recentHistory.reduce((sum, h) => sum + h.activeRequests, 0) / recentHistory.length;

      // Calculate adaptive weight (higher is better)
      // Base weight from configuration
      const baseWeight = this.weights.get(endpoint) || 1;

      // Performance factors (0-1 scale, higher is better)
      const responseTimeScore = Math.max(0, 1 - (avgResponseTime / 2000)); // Better if under 2s
      const successScore = successRate; // Direct success rate
      const loadScore = Math.max(0, 1 - (avgLoad / 20)); // Better if under 20 active requests

      // Combined score with weights
      const performanceScore = (
        responseTimeScore * 0.6 +
        successScore * 0.25 +
        loadScore * 0.15
      );

      // Adaptive weight: base weight adjusted by performance (0.1 to 3.0 range)
      // Better performance = higher weight, worse performance = lower weight
      const adaptiveWeight = Math.max(0.1, Math.min(3.0, baseWeight * performanceScore * 2));
      this.adaptiveWeights.set(endpoint, adaptiveWeight);
    }
  }

  /**
   * ALTER Algorithm - Adaptive Load balancing with Enhanced Response Time
   * Advanced algorithm considering historical performance, adaptive weights, and real-time metrics
   * @param {Array} endpoints - Healthy endpoints to choose from
   * @returns {string} - Selected endpoint
   */
  _alterAlgorithm(endpoints) {
    if (endpoints.length === 1) {
      return endpoints[0];
    }

    const now = Date.now();

    // Calculate scores for each endpoint
    const endpointScores = endpoints.map(endpoint => {
      const status = this.endpoints.get(endpoint);
      const activeRequests = this.requestCounts.get(endpoint) || 0;
      const avgResponseTime = this.responseTimes.get(endpoint) || 100;
      const totalRequests = this.responseTimeCounts.get(endpoint) || 1;
      const errorRate = status.failures / Math.max(totalRequests, 1);
      const adaptiveWeight = this.adaptiveWeights.get(endpoint) || 1.0;

      // Get recent performance trends (last 30 seconds)
      const history = this.performanceHistory.get(endpoint) || [];
      const recentHistory = history.filter(h => now - h.timestamp < 30000);

      // Calculate trend metrics
      let responseTimeTrend = 0;
      let loadTrend = 0;
      if (recentHistory.length >= 2) {
        const recent = recentHistory.slice(-10); // Last 10 measurements
        const older = recentHistory.slice(-20, -10); // Previous 10 measurements

        if (older.length > 0) {
          const recentAvgRT = recent.reduce((sum, h) => sum + h.responseTime, 0) / recent.length;
          const olderAvgRT = older.reduce((sum, h) => sum + h.responseTime, 0) / older.length;
          responseTimeTrend = (olderAvgRT - recentAvgRT) / olderAvgRT; // Positive = improving

          const recentAvgLoad = recent.reduce((sum, h) => sum + h.activeRequests, 0) / recent.length;
          const olderAvgLoad = older.reduce((sum, h) => sum + h.activeRequests, 0) / older.length;
          loadTrend = (olderAvgLoad - recentAvgLoad) / Math.max(olderAvgLoad, 1); // Positive = load decreasing
        }
      }

      // Normalize metrics (0-1 scale, where 1 is best)
      const normalizedLoad = Math.max(0, 1 - (activeRequests / 20)); // Better with fewer active requests
      const normalizedResponseTime = Math.max(0, 1 - (avgResponseTime / 3000)); // Better under 3s
      const normalizedErrorRate = Math.max(0, 1 - errorRate); // Better with lower error rate
      const normalizedTrend = Math.min(1, Math.max(0, 0.5 + responseTimeTrend * 0.5 + loadTrend * 0.3)); // Trend bonus

      // Adaptive weight factor (boost high-performing endpoints)
      const weightFactor = Math.min(2.0, adaptiveWeight);

      // Calculate composite score (higher is better)
      // Weights: 25% current load, 25% response time, 20% error rate, 15% trends, 15% adaptive weight
      const baseScore = (
        normalizedLoad * 0.25 +
        normalizedResponseTime * 0.25 +
        normalizedErrorRate * 0.20 +
        normalizedTrend * 0.15 +
        (weightFactor - 1) * 0.15 // Normalize weight factor contribution
      );

      // Add small randomization to prevent thundering herd (0-5% variation)
      const randomFactor = (Math.random() * 0.05);
      const finalScore = baseScore * (1 + randomFactor);

      return {
        endpoint,
        score: finalScore,
        metrics: {
          activeRequests,
          avgResponseTime,
          errorRate,
          adaptiveWeight,
          responseTimeTrend,
          loadTrend,
          totalRequests
        }
      };
    });

    // Sort by score (descending - higher score is better)
    endpointScores.sort((a, b) => b.score - a.score);

    // Return the endpoint with the best (highest) score
    return endpointScores[0].endpoint;
  }

  async _performHealthChecks() {
    const healthCheckPromises = Array.from(this.endpoints.keys()).map(async (endpoint) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${endpoint}${this.healthCheckUrl}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Edge-Utils-LoadBalancer' }
        });

        clearTimeout(timeoutId);

        const success = response.ok;
        this._updateHealthStatus(endpoint, success);
      } catch (error) {
        this._updateHealthStatus(endpoint, false);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  _updateHealthStatus(endpoint, success) {
    const status = this.endpoints.get(endpoint);

    if (success) {
      status.successes = Math.min(status.successes + 1, this.successThreshold + 1);
      status.failures = 0;

      if (status.successes >= this.successThreshold && !status.healthy) {
        status.healthy = true;
      }
    } else {
      status.failures++;
      status.successes = 0;

      if (status.failures >= this.failureThreshold && status.healthy) {
        status.healthy = false;
      }
    }
  }
}

/**
 * Circuit Breaker for fault tolerance
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.monitoringStart = Date.now();
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      this.requestCount++;
      const result = await operation();

      this._recordSuccess();
      return result;
    } catch (error) {
      this._recordFailure();
      throw error;
    }
  }

  _recordSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) { // Require 2 successes to close
        this.state = 'CLOSED';
      }
    }
  }

  _recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getStats() {
    const now = Date.now();
    const periodElapsed = now - this.monitoringStart;

    if (periodElapsed >= this.monitoringPeriod) {
      // Reset monitoring period
      this.monitoringStart = now;
      const failureRate = this.requestCount > 0 ? (this.failures / this.requestCount) : 0;

      return {
        state: this.state,
        failureRate,
        requestCount: this.requestCount,
        failures: this.failures,
        successCount: this.successCount
      };
    }

    return {
      state: this.state,
      requestCount: this.requestCount,
      failures: this.failures,
      successCount: this.successCount
    };
  }
}

/**
 * Sticky Session Manager for session affinity
 */
class StickySessionManager {
  constructor(options = {}) {
    this.storage = options.storage || new Map();
    this.ttl = options.ttl || 1800000; // 30 minutes
    this.hashAlgorithm = options.hashAlgorithm || 'md5';
  }

  /**
   * Get sticky endpoint for client
   * @param {string} clientId - Unique client identifier
   * @param {Array} endpoints - Available endpoints
   * @returns {string} - Selected endpoint
   */
  getStickyEndpoint(clientId, endpoints) {
    const key = `sticky:${clientId}`;
    const now = Date.now();

    // Check if we have a cached assignment
    const cached = this.storage.get(key);
    if (cached && (now - cached.timestamp) < this.ttl) {
      // Verify endpoint is still available
      if (endpoints.includes(cached.endpoint)) {
        return cached.endpoint;
      }
    }

    // Assign new endpoint
    const hash = crypto.createHash(this.hashAlgorithm)
      .update(clientId)
      .digest('hex');

    const index = parseInt(hash.substring(0, 8), 16) % endpoints.length;
    const endpoint = endpoints[index];

    // Cache the assignment
    this.storage.set(key, {
      endpoint,
      timestamp: now
    });

    return endpoint;
  }

  /**
   * Clear expired sticky sessions
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, value] of this.storage) {
      if (key.startsWith('sticky:') && (now - value.timestamp) > this.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
  }
}

module.exports = {
  LoadBalancer,
  CircuitBreaker,
  StickySessionManager
};