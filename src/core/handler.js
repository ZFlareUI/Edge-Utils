/**
 * Universal Edge HTTP Handler
 * @module edge-utils/core/handler
 */
const { detectPlatform } = require('./platform');
const { parseBody, sendJson, setCors } = require('./utils');

function createEdgeHandler(options = {}) {
  return async function handler(request, context) {
    const platform = detectPlatform();
    // CORS
    const corsHeaders = setCors(options.cors);
    // Parse body
    const body = await parseBody(request);
    // Custom logic can be added here
    return sendJson({ platform, body }, { headers: corsHeaders });
  };
}

module.exports = { createEdgeHandler };