/**
 * Response streaming helpers
 * @module edge-utils/performance/streaming
 */
function streamResponse(stream, headers = {}) {
  return new Response(stream, {
    status: 200,
    headers
  });
}

async function* generateStream(data) {
  for (const chunk of data) {
    yield chunk;
  }
}

function createReadableStream(generator) {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

module.exports = { streamResponse, generateStream, createReadableStream };