// Cloudflare Workers example
import { createEdgeHandler, MemoryCache, geoRoute } from 'edge-utils';

const cache = new MemoryCache({ ttl: 300 });

export default createEdgeHandler({
  cache: { strategy: 'memory' },
  geo: { routing: 'nearest', regions: ['us', 'eu', 'asia'] },
  cors: { origins: ['https://example.com'], methods: ['GET', 'POST'] }
});

// Custom logic
export async function handleRequest(request) {
  const url = new URL(request.url);
  const key = url.pathname;

  let data = cache.get(key);
  if (!data) {
    // Fetch data
    data = { message: 'Hello from Cloudflare' };
    cache.set(key, data);
  }

  const region = geoRoute(request.headers, ['us', 'eu', 'asia']);
  return new Response(JSON.stringify({ ...data, region }), {
    headers: { 'content-type': 'application/json' }
  });
}