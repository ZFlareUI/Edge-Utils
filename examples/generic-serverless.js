// Generic serverless example (Node.js)
const { createEdgeHandler, circuitBreaker, retryWithBackoff } = require('edge-utils');

const handler = createEdgeHandler({
  cors: { origins: ['*'] }
});

// Circuit breaker for external API
const fetchData = circuitBreaker(async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('API error');
  return response.json();
});

exports.handler = async (event, context) => {
  try {
    const data = await retryWithBackoff(() => fetchData('https://api.example.com/data'), 3);
    return handler(event, context);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Service unavailable' })
    };
  }
};