/**
 * Platform Detection Utilities
 * @module edge-utils/core/platform
 */
function detectPlatform() {
  if (typeof globalThis.Deno !== 'undefined') return 'deno';
  if (typeof globalThis.EdgeRuntime !== 'undefined') return 'vercel';
  if (typeof globalThis.WebSocketPair !== 'undefined') return 'cloudflare';
  if (typeof globalThis.AWS !== 'undefined') return 'aws';
  if (typeof process !== 'undefined' && process.env && process.env.AWS_EXECUTION_ENV) return 'aws';
  return 'generic';
}

function isCloudflareWorker() {
  return detectPlatform() === 'cloudflare';
}

function isVercelEdge() {
  return detectPlatform() === 'vercel';
}

module.exports = { detectPlatform, isCloudflareWorker, isVercelEdge };