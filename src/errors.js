/**
 * Error handling utilities for edge environments
 * @module edge-utils/errors
 */
class EdgeError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'EdgeError';
    this.status = status;
  }
}

function handleError(error, options = {}) {
  if (options.log) {
    // Log to stderr if available, otherwise use appropriate logger
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(`[ERROR] ${error.stack || error.message}\n`);
    } else if (options.logger && typeof options.logger.error === 'function') {
      options.logger.error('Error occurred', { error: error.message, stack: error.stack });
    }
  }
  if (options.retry) {
    // Implement retry logic
    return retryWithBackoff(() => { throw error; }, options.retryAttempts || 3);
  }
  if (options.fallback) {
    return new Response(null, {
      status: 302,
      headers: { location: options.fallback }
    });
  }
  return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
    status: error.status || 500,
    headers: { 'content-type': 'application/json' }
  });
}

async function retryWithBackoff(fn, attempts, delay = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

function circuitBreaker(fn, failureThreshold = 5, recoveryTimeout = 60000) {
  let failures = 0;
  let lastFailureTime = 0;
  let state = 'closed'; // closed, open, half-open

  return async function (...args) {
    if (state === 'open') {
      if (Date.now() - lastFailureTime > recoveryTimeout) {
        state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn(...args);
      if (state === 'half-open') {
        state = 'closed';
        failures = 0;
      }
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = Date.now();
      if (failures >= failureThreshold) {
        state = 'open';
      }
      throw error;
    }
  };
}

module.exports = { EdgeError, handleError, retryWithBackoff, circuitBreaker };