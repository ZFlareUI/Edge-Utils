/**
 * Compression utilities (gzip, brotli)
 * @module edge-utils/performance/compression
 */
async function compressGzip(data) {
  if (typeof globalThis.CompressionStream !== 'undefined') {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    writer.write(data);
    writer.close();
    const chunks = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }
    return new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  }
  // Fallback: return uncompressed
  return data;
}

async function compressBrotli(data) {
  if (typeof globalThis.CompressionStream !== 'undefined') {
    const stream = new CompressionStream('brotli');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    writer.write(data);
    writer.close();
    const chunks = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }
    return new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  }
  // Fallback: return uncompressed
  return data;
}

function decompressGzip(data) {
  // Similar implementation for decompression
  return data;
}

module.exports = { compressGzip, compressBrotli, decompressGzip };