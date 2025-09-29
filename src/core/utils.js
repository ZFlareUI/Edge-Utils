/**
 * Core Utilities for Edge Handlers
 * @module edge-utils/core/utils
 */
async function parseBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await request.json();
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }
  if (contentType.includes('text/plain')) {
    return await request.text();
  }
  return null;
}

function sendJson(data, opts = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...(opts.headers || {})
    }
  });
}

function sendRedirect(url, status = 302, opts = {}) {
  return new Response(null, {
    status,
    headers: {
      location: url,
      ...(opts.headers || {})
    }
  });
}

function sendStream(stream, opts = {}) {
  return new Response(stream, {
    status: 200,
    headers: {
      ...(opts.headers || {})
    }
  });
}

function setCors(cors) {
  if (!cors) return {};
  return {
    'access-control-allow-origin': (cors.origins || ['*']).join(','),
    'access-control-allow-methods': (cors.methods || ['GET', 'POST']).join(',')
  };
}

module.exports = { parseBody, sendJson, sendRedirect, sendStream, setCors };