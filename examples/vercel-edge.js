// Vercel Edge Functions example
import { createEdgeHandler, EdgeCache, getCountry } from 'edge-utils';

const cache = new EdgeCache();

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const country = getCountry(request.headers);
  const key = `data-${country}`;

  let data = await cache.get(key);
  if (!data) {
    data = { country, timestamp: Date.now() };
    await cache.set(key, data);
  }

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' }
  });
}