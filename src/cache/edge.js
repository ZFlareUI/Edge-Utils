/**
 * Edge-compatible cache (platform-specific implementations)
 * @module edge-utils/cache/edge
 */
const { detectPlatform } = require('../core/platform');

class EdgeCache {
  constructor() {
    this.platform = detectPlatform();
  }

  async get(key) {
    switch (this.platform) {
      case 'cloudflare':
        // Use Cloudflare KV
        if (typeof globalThis.KV !== 'undefined') {
          return await globalThis.KV.get(key);
        }
        break;
      case 'vercel':
        // Use Vercel Edge Config
        if (typeof globalThis.EdgeConfig !== 'undefined') {
          return await globalThis.EdgeConfig.get(key);
        }
        break;
      case 'deno':
        // Use Deno KV
        if (typeof globalThis.Deno !== 'undefined' && globalThis.Deno.Kv) {
          const kv = await globalThis.Deno.Kv.open();
          const result = await kv.get([key]);
          return result.value;
        }
        break;
      default:
        // Fallback to no-op
        return undefined;
    }
    return undefined;
  }

  async set(key, value) {
    switch (this.platform) {
      case 'cloudflare':
        if (typeof globalThis.KV !== 'undefined') {
          await globalThis.KV.put(key, JSON.stringify(value));
        }
        break;
      case 'vercel':
        if (typeof globalThis.EdgeConfig !== 'undefined') {
          await globalThis.EdgeConfig.put(key, value);
        }
        break;
      case 'deno':
        if (typeof globalThis.Deno !== 'undefined' && globalThis.Deno.Kv) {
          const kv = await globalThis.Deno.Kv.open();
          await kv.set([key], value);
        }
        break;
      default:
        // No-op
        break;
    }
  }

  async delete(key) {
    switch (this.platform) {
      case 'cloudflare':
        if (typeof globalThis.KV !== 'undefined') {
          await globalThis.KV.delete(key);
        }
        break;
      case 'vercel':
        if (typeof globalThis.EdgeConfig !== 'undefined') {
          await globalThis.EdgeConfig.del(key);
        }
        break;
      case 'deno':
        if (typeof globalThis.Deno !== 'undefined' && globalThis.Deno.Kv) {
          const kv = await globalThis.Deno.Kv.open();
          await kv.delete([key]);
        }
        break;
      default:
        // No-op
        break;
    }
  }
}

module.exports = { EdgeCache };