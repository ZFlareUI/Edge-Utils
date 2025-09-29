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

function keepAlive(intervalMs = 300000) { // 5 minutes
  setInterval(() => {
    // Ping to keep function warm
    console.log('Keeping alive');
  }, intervalMs);
}

module.exports = { minimizeColdStart, keepAlive };