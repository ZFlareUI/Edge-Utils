/**
 * Cold start minimization utilities
 * @module edge-utils/performance/cold-start
 */
let initialized = false;

function minimizeColdStart(init) {
  if (!initialized) {
    init();
    initialized = true;
  }
}

function keepAlive(intervalMs = 300000, onPing = null) { // 5 minutes
  setInterval(() => {
    // Ping to keep function warm
    if (onPing && typeof onPing === 'function') {
      onPing();
    }
    // Silent operation - no console output in production
  }, intervalMs);
}

module.exports = { minimizeColdStart, keepAlive };