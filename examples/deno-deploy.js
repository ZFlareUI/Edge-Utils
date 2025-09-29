// Deno Deploy example
import { createEdgeHandler, nearestRegion, compressGzip } from 'edge-utils';

export default createEdgeHandler({
  geo: { routing: 'nearest', regions: ['us', 'eu', 'asia'] }
});

// Custom handler
export async function handler(request) {
  const url = new URL(request.url);
  const userRegion = url.searchParams.get('region') || 'us';
  const availableRegions = ['us', 'eu', 'asia'];
  const nearest = nearestRegion(userRegion, availableRegions);

  const data = { nearest, userRegion };
  const json = JSON.stringify(data);
  const compressed = await compressGzip(new TextEncoder().encode(json));

  return new Response(compressed, {
    headers: {
      'content-type': 'application/json',
      'content-encoding': 'gzip'
    }
  });
}