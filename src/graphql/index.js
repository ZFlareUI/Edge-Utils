/**
 * GraphQL utilities for edge computing environments
 * Provides query execution, caching, error handling, and middleware support
 * Compatible with Cloudflare Workers, Vercel Edge, and Deno Deploy
 */

const OperationType = {
  QUERY: 'query',
  MUTATION: 'mutation',
  SUBSCRIPTION: 'subscription'
};

const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * GraphQL client for executing queries and mutations
 */
class GraphQLClient {
  /**
   * Create a new GraphQL client
   * @param {Object} options - Configuration options
   * @param {string} options.endpoint - GraphQL endpoint URL
   * @param {Object} options.headers - Default headers for requests
   * @param {number} options.timeout - Request timeout in ms (default: 30000)
   * @param {boolean} options.enableCache - Enable query caching (default: true)
   * @param {number} options.cacheTTL - Cache TTL in ms (default: 300000)
   * @param {Function} options.onError - Error handler function
   * @param {Function} options.onSuccess - Success handler function
   */
  constructor(options = {}) {
    this.options = {
      endpoint: '',
      headers: {},
      timeout: 30000, // 30 seconds default
      enableCache: true,
      cacheTTL: 300000, // 5 minutes default
      ...options
    };

    this.cache = new Map();
    this.activeRequests = new Map();
    this.timeouts = new Set(); // Store timeout IDs for cleanup
  }

  /**
   * Execute a GraphQL query
   * @param {string} query - GraphQL query string
   * @param {Object} variables - Query variables
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Query result
   */
  async query(query, variables = {}, options = {}) {
    return this._execute(OperationType.QUERY, query, variables, options);
  }

  /**
   * Execute a GraphQL mutation
   * @param {string} mutation - GraphQL mutation string
   * @param {Object} variables - Mutation variables
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Mutation result
   */
  async mutate(mutation, variables = {}, options = {}) {
    return this._execute(OperationType.MUTATION, mutation, variables, options);
  }

  /**
   * Execute a GraphQL subscription (limited support in edge environments)
   * @param {string} subscription - GraphQL subscription string
   * @param {Object} variables - Subscription variables
   * @param {Function} callback - Callback for subscription events
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Subscription setup result
   */
  async subscribe(subscription, variables = {}, callback, options = {}) {
    // Note: Full subscription support may be limited in edge environments
    // This provides basic subscription setup
    return this._execute(OperationType.SUBSCRIPTION, subscription, variables, {
      ...options,
      subscriptionCallback: callback
    });
  }

  /**
   * Execute GraphQL operation with caching and error handling
   * @private
   */
  async _execute(operation, query, variables = {}, options = {}) {
    const cacheKey = this._generateCacheKey(operation, query, variables);
    const shouldCache = this.options.enableCache && operation === OperationType.QUERY && !options.skipCache;

    // Check cache for queries
    if (shouldCache) {
      const cached = this._getCached(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for duplicate active requests
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey);
    }

    const requestPromise = this._performRequest(operation, query, variables, options);

    if (shouldCache) {
      this.activeRequests.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;

      // Cache successful query results
      if (shouldCache && result.data && !result.errors) {
        this._setCached(cacheKey, result);
      }

      if (this.options.onSuccess) {
        this.options.onSuccess(operation, result);
      }

      return result;
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(operation, error);
      }
      throw error;
    } finally {
      if (shouldCache) {
        this.activeRequests.delete(cacheKey);
      }
    }
  }

  /**
   * Perform the actual HTTP request
   * @private
   */
  async _performRequest(operation, query, variables, options) {
    const payload = {
      query: query.trim(),
      variables: variables || {},
      operationName: options.operationName
    };

    const headers = {
      'Content-Type': 'application/json',
      ...this.options.headers,
      ...options.headers
    };

    const requestOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: this._createAbortSignal(options.timeout || this.options.timeout)
    };

    try {
      const response = await fetch(this.options.endpoint, requestOptions);

      // Clear any remaining timeouts for this request
      this._clearTimeouts();

      if (!response.ok) {
        throw new GraphQLError(
          `HTTP ${response.status}: ${response.statusText}`,
          ErrorSeverity.CRITICAL,
          { status: response.status, statusText: response.statusText }
        );
      }

      const result = await response.json();

      // Handle GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const severity = this._determineErrorSeverity(result.errors);
        throw new GraphQLError(
          'GraphQL operation failed',
          severity,
          { graphqlErrors: result.errors, data: result.data }
        );
      }

      return result;
    } catch (error) {
      // Clear any remaining timeouts for this request
      this._clearTimeouts();

      if (error.name === 'AbortError') {
        throw new GraphQLError('Request timeout', ErrorSeverity.ERROR, { timeout: true });
      }
      throw error;
    }
  }

  /**
   * Create abort signal for request timeout
   * @private
   */
  _createAbortSignal(timeout) {
    if (typeof AbortController === 'undefined') {
      return undefined; // Fallback for environments without AbortController
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.timeouts.delete(timeoutId); // Remove from set when it fires
    }, timeout);
    this.timeouts.add(timeoutId); // Store timeout ID

    return controller.signal;
  }

  /**
   * Generate cache key for query
   * @private
   */
  _generateCacheKey(operation, query, variables) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const variablesStr = JSON.stringify(variables || {});
    return `${operation}:${normalizedQuery}:${variablesStr}`;
  }

  /**
   * Get cached result
   * @private
   */
  _getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.options.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached result
   * @private
   */
  _setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old cache entries periodically
    if (this.cache.size > 100) {
      this._cleanupCache();
    }
  }

  /**
   * Cleanup expired cache entries
   * @private
   */
  _cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.options.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Determine error severity from GraphQL errors
   * @private
   */
  _determineErrorSeverity(errors) {
    const hasCritical = errors.some(error =>
      error.extensions?.code === 'INTERNAL_SERVER_ERROR' ||
      error.message.includes('timeout') ||
      error.message.includes('network')
    );

    if (hasCritical) return ErrorSeverity.CRITICAL;

    const hasError = errors.some(error =>
      error.extensions?.code === 'VALIDATION_ERROR' ||
      error.extensions?.code === 'FORBIDDEN'
    );

    return hasError ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;
  }

  /**
   * Clear all pending timeouts
   * @private
   */
  _clearTimeouts() {
    for (const timeoutId of this.timeouts) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }

  /**
   * Clear cache and pending timeouts
   */
  clearCache() {
    this.cache.clear();
    this.activeRequests.clear();
    this._clearTimeouts();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      activeRequests: this.activeRequests.size
    };
  }
}

/**
 * GraphQL error class
 */
class GraphQLError extends Error {
  constructor(message, severity = ErrorSeverity.ERROR, details = {}) {
    super(message);
    this.name = 'GraphQLError';
    this.severity = severity;
    this.details = details;
  }
}

/**
 * GraphQL schema utilities
 */
class GraphQLSchema {
  /**
   * Validate GraphQL query against schema
   * @param {string} query - GraphQL query
   * @param {Object} schema - GraphQL schema object
   * @returns {Object} Validation result
   */
  static validateQuery(query, schema) {
    // Basic validation - in production, use a proper GraphQL validation library
    const errors = [];

    // Check for basic syntax issues
    if (!query || typeof query !== 'string') {
      errors.push({ message: 'Query must be a non-empty string' });
    }

    // Check for balanced braces
    const openBraces = (query.match(/\{/g) || []).length;
    const closeBraces = (query.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({ message: 'Unbalanced braces in query' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract operation names from query
   * @param {string} query - GraphQL query
   * @returns {string[]} Operation names
   */
  static extractOperationNames(query) {
    const operationRegex = /(?:query|mutation|subscription)\s+(\w+)/g;
    const matches = [];
    let match;

    while ((match = operationRegex.exec(query)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Check if query is a read operation
   * @param {string} query - GraphQL query
   * @returns {boolean} True if query operation
   */
  static isQueryOperation(query) {
    return /^\s*query\s/i.test(query);
  }

  /**
   * Check if query is a write operation
   * @param {string} query - GraphQL query
   * @returns {boolean} True if mutation operation
   */
  static isMutationOperation(query) {
    return /^\s*mutation\s/i.test(query);
  }
}

/**
 * GraphQL query builder utilities
 */
class GraphQLQueryBuilder {
  /**
   * Build a simple query
   * @param {string} operationName - Operation name
   * @param {string[]} fields - Fields to select
   * @param {Object} args - Query arguments
   * @returns {string} GraphQL query string
   */
  static buildQuery(operationName, fields, args = {}) {
    const argsStr = this._buildArgsString(args);
    const fieldsStr = this._buildFieldsString(fields);

    return `query ${operationName}${argsStr} {
  ${operationName}${argsStr ? `(${Object.keys(args).join(', ')})` : ''} {
    ${fieldsStr}
  }
}`;
  }

  /**
   * Build a mutation
   * @param {string} operationName - Operation name
   * @param {Object} input - Mutation input
   * @param {string[]} returnFields - Fields to return
   * @returns {string} GraphQL mutation string
   */
  static buildMutation(operationName, input, returnFields) {
    const inputStr = JSON.stringify(input).replace(/"/g, '');
    const fieldsStr = this._buildFieldsString(returnFields);

    return `mutation {
  ${operationName}(input: ${inputStr}) {
    ${fieldsStr}
  }
}`;
  }

  /**
   * Build arguments string
   * @private
   */
  static _buildArgsString(args) {
    if (!args || Object.keys(args).length === 0) return '';

    const argStrings = Object.entries(args).map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: "${value}"`;
      }
      return `${key}: ${value}`;
    });

    return `(${argStrings.join(', ')})`;
  }

  /**
   * Build fields string
   * @private
   */
  static _buildFieldsString(fields) {
    if (!Array.isArray(fields)) return fields;

    return fields.map(field => {
      if (typeof field === 'string') return field;
      if (typeof field === 'object') {
        const subFields = Object.entries(field).map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key} { ${this._buildFieldsString(value)} }`;
          }
          return key;
        });
        return subFields.join(' ');
      }
      return field;
    }).join(' ');
  }
}

/**
 * Create GraphQL middleware for edge functions
 * @param {Object} options - Middleware options
 * @returns {Function} Middleware function
 */
function createGraphQLMiddleware(options = {}) {
  const client = new GraphQLClient(options);

  return {
    client,

    /**
     * Handle GraphQL requests
     * @param {Request} request - Incoming request
     * @param {Object} env - Environment variables
     * @param {Object} ctx - Execution context
     * @returns {Response} GraphQL response
     */
    async handleRequest(request, env, ctx) {
      try {
        // Only handle POST requests to GraphQL endpoints
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return new Response('Content-Type must be application/json', { status: 400 });
        }

        const body = await request.json();

        if (!body.query) {
          return new Response('Missing query in request body', { status: 400 });
        }

        // Execute the GraphQL operation
        const result = await client._execute(
          body.operationName || OperationType.QUERY,
          body.query,
          body.variables,
          { headers: Object.fromEntries(request.headers.entries()) }
        );

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });

      } catch (error) {
        const statusCode = error.severity === ErrorSeverity.CRITICAL ? 500 : 400;

        return new Response(JSON.stringify({
          errors: [{
            message: error.message,
            severity: error.severity,
            details: error.details
          }]
        }), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },

    /**
     * Handle CORS preflight requests
     * @param {Request} request - Incoming request
     * @returns {Response} CORS response
     */
    handleOptions(request) {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
  };
}

module.exports = {
  GraphQLClient,
  GraphQLError,
  GraphQLSchema,
  GraphQLQueryBuilder,
  createGraphQLMiddleware,
  OperationType,
  ErrorSeverity
};