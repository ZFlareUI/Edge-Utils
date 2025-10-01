---
title: "Performance Utilities"
description: "Optimize your edge applications with performance monitoring, cold start detection, and streaming responses"
---

# Performance Utilities

Edge-Utils provides comprehensive performance monitoring and optimization tools specifically designed for edge computing environments.

## Features

- **Cold Start Detection**: Monitor and optimize cold start performance
- **Streaming Responses**: Efficient streaming for large responses
- **Performance Metrics**: Real-time performance monitoring
- **Compression**: Automatic response compression
- **Resource Monitoring**: Memory and CPU usage tracking

## Cold Start Detection

Monitor and optimize cold start performance in serverless environments.

```js
import { ColdStartDetector, PerformanceMonitor } from 'edge-utils';

const coldStart = new ColdStartDetector();
const monitor = new PerformanceMonitor();

// Detect cold starts
if (coldStart.isColdStart()) {
  console.log('Cold start detected, initializing...');
  // Perform initialization logic
}

// Monitor performance
monitor.start('request-processing');

try {
  // Your application logic
  const result = await processRequest();

  monitor.end('request-processing');

  // Log performance metrics
  console.log('Request processing time:', monitor.getDuration('request-processing'));

  return new Response(JSON.stringify(result));
} catch (error) {
  monitor.end('request-processing');
  throw error;
}
```

### Advanced Cold Start Handling

```js
const coldStart = new ColdStartDetector({
  warmUpThreshold: 10000, // 10 seconds
  metrics: true
});

// Warm-up function for optimization
async function warmUp() {
  if (coldStart.isColdStart()) {
    console.log('Performing warm-up...');

    // Pre-load frequently used data
    await preloadData();

    // Initialize connections
    await initializeConnections();

    console.log('Warm-up complete');
  }
}

// Usage in edge function
export default {
  async fetch(request) {
    await warmUp();

    // Application logic
    return new Response('Hello, warmed up!');
  }
};
```

## Streaming Responses

Handle large responses efficiently with streaming.

```js
import { StreamingResponse, CompressionMiddleware } from 'edge-utils';

export default {
  async fetch(request) {
    // Create streaming response
    const stream = new StreamingResponse();

    // Add compression
    const compressedStream = new CompressionMiddleware(stream, {
      threshold: 1024, // Compress responses > 1KB
      algorithm: 'gzip'
    });

    // Start response
    compressedStream.write('{"data": [');

    // Stream large dataset
    const items = await getLargeDataset();
    for (let i = 0; i < items.length; i++) {
      if (i > 0) compressedStream.write(',');
      compressedStream.write(JSON.stringify(items[i]));

      // Yield control to prevent blocking
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    compressedStream.write(']}');
    compressedStream.end();

    return new Response(compressedStream.getReader(), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip'
      }
    });
  }
};
```

### Advanced Streaming

```js
import { StreamingResponse, CompressionMiddleware } from 'edge-utils';

class DataStreamer {
  constructor() {
    this.stream = new StreamingResponse();
    this.compression = new CompressionMiddleware(this.stream, {
      threshold: 2048,
      algorithm: 'deflate'
    });
  }

  async streamLargeQuery(request) {
    const { query, variables } = await request.json();

    // Start JSON response
    this.compression.write('{"data":');

    // Stream GraphQL query results
    const results = await executeStreamingQuery(query, variables);

    for await (const chunk of results) {
      this.compression.write(JSON.stringify(chunk));
    }

    this.compression.write('}');
    this.compression.end();

    return new Response(this.compression.getReader(), {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      }
    });
  }
}
```

## Performance Monitoring

Monitor application performance in real-time.

```js
import { PerformanceMonitor, MetricsCollector } from 'edge-utils';

const monitor = new PerformanceMonitor();
const metrics = new MetricsCollector();

// Track request performance
export default {
  async fetch(request) {
    const startTime = monitor.start('total-request');

    try {
      // Track database query
      const queryTime = monitor.start('database-query');
      const data = await fetchFromDatabase();
      monitor.end('database-query');

      // Track processing
      const processTime = monitor.start('data-processing');
      const result = await processData(data);
      monitor.end('data-processing');

      monitor.end('total-request');

      // Collect metrics
      const performanceMetrics = {
        totalTime: monitor.getDuration('total-request'),
        queryTime: monitor.getDuration('database-query'),
        processTime: monitor.getDuration('data-processing'),
        memoryUsage: monitor.getMemoryUsage(),
        cpuUsage: monitor.getCpuUsage()
      };

      // Send metrics to monitoring service
      await metrics.send('performance', performanceMetrics);

      return new Response(JSON.stringify(result));
    } catch (error) {
      monitor.end('total-request');

      // Track error metrics
      await metrics.send('error', {
        error: error.message,
        duration: monitor.getDuration('total-request')
      });

      throw error;
    }
  }
};
```

### Custom Metrics

```js
const metrics = new MetricsCollector({
  endpoint: 'https://metrics.example.com/collect',
  apiKey: 'your-api-key',
  batchSize: 10,
  flushInterval: 30000
});

// Define custom metrics
metrics.define('api_calls', 'counter', 'Number of API calls');
metrics.define('response_time', 'histogram', 'Response time distribution');
metrics.define('error_rate', 'gauge', 'Error rate percentage');

// Track metrics
export default {
  async fetch(request) {
    const startTime = Date.now();

    try {
      metrics.increment('api_calls', { endpoint: request.url });

      const result = await processRequest(request);

      const duration = Date.now() - startTime;
      metrics.record('response_time', duration, {
        method: request.method,
        status: 200
      });

      return new Response(JSON.stringify(result));
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.record('response_time', duration, {
        method: request.method,
        status: 500
      });

      metrics.increment('error_rate');

      throw error;
    }
  }
};
```

## Compression

Automatic response compression for better performance.

```js
import { CompressionMiddleware, CompressionManager } from 'edge-utils';

const compression = new CompressionManager({
  algorithms: ['gzip', 'deflate', 'br'],
  threshold: 1024, // Compress > 1KB
  level: 6 // Compression level
});

export default {
  async fetch(request) {
    const response = await generateResponse(request);

    // Apply compression
    const compressedResponse = await compression.compress(response, {
      acceptEncoding: request.headers.get('Accept-Encoding')
    });

    return compressedResponse;
  }
};
```

### Advanced Compression

```js
const compression = new CompressionManager({
  algorithms: {
    gzip: { level: 6, memLevel: 8 },
    deflate: { level: 6 },
    br: { level: 6, lgwin: 22 }
  },
  threshold: 512,
  filter: (response) => {
    // Don't compress already compressed content
    const contentType = response.headers.get('Content-Type');
    return !contentType?.includes('image/') &&
           !contentType?.includes('video/') &&
           !response.headers.has('Content-Encoding');
  }
});

// Middleware usage
const compressionMiddleware = async (request, next) => {
  const response = await next(request);

  if (compression.shouldCompress(response)) {
    return await compression.compress(response, {
      acceptEncoding: request.headers.get('Accept-Encoding')
    });
  }

  return response;
};
```

## Resource Monitoring

Monitor memory and CPU usage in edge environments.

```js
import { ResourceMonitor, AlertManager } from 'edge-utils';

const resourceMonitor = new ResourceMonitor({
  memoryThreshold: 128 * 1024 * 1024, // 128MB
  cpuThreshold: 80, // 80%
  checkInterval: 5000 // Check every 5 seconds
});

const alerts = new AlertManager({
  webhook: 'https://alerts.example.com/webhook'
});

// Monitor resources
resourceMonitor.on('memory-high', (usage) => {
  console.warn(`High memory usage: ${usage}MB`);
  alerts.send('memory', { usage, threshold: resourceMonitor.memoryThreshold });
});

resourceMonitor.on('cpu-high', (usage) => {
  console.warn(`High CPU usage: ${usage}%`);
  alerts.send('cpu', { usage, threshold: resourceMonitor.cpuThreshold });
});

resourceMonitor.start();

// Usage in application
export default {
  async fetch(request) {
    const usage = resourceMonitor.getCurrentUsage();

    if (usage.memory > resourceMonitor.memoryThreshold * 0.9) {
      // Implement memory optimization strategies
      await optimizeMemory();
    }

    // Application logic
    return new Response('OK');
  }
};
```

## Performance Optimization Tips

### 1. Connection Pooling

```js
import { ConnectionPool } from 'edge-utils';

const pool = new ConnectionPool({
  maxConnections: 10,
  minConnections: 2,
  idleTimeout: 30000
});

// Reuse connections
const connection = await pool.acquire();
try {
  const result = await connection.query('SELECT * FROM data');
  return result;
} finally {
  pool.release(connection);
}
```

### 2. Caching Strategy

```js
import { CacheManager, CacheStrategy } from 'edge-utils';

const cache = new CacheManager({
  strategy: CacheStrategy.LRU,
  ttl: 300000, // 5 minutes
  maxSize: 100
});

// Cache expensive operations
const getData = cache.memoize(async (key) => {
  // Expensive operation
  return await fetchExpensiveData(key);
}, { ttl: 600000 }); // 10 minutes
```

### 3. Lazy Loading

```js
import { LazyLoader } from 'edge-utils';

const lazyLoader = new LazyLoader();

// Lazy load heavy modules
const heavyModule = lazyLoader.load(async () => {
  return await import('./heavy-module.js');
});

// Use in request handler
export default {
  async fetch(request) {
    if (request.url.includes('/heavy')) {
      const module = await heavyModule;
      return module.handle(request);
    }

    return new Response('Light response');
  }
};
```

## Platform-Specific Optimizations

### Cloudflare Workers

```js
import { PerformanceMonitor } from 'edge-utils';

export default {
  async fetch(request) {
    // Use Cloudflare's performance APIs
    const monitor = new PerformanceMonitor({
      platform: 'cloudflare'
    });

    monitor.start('cf-request');

    // Access Cloudflare-specific metrics
    const cfMetrics = {
      colo: request.cf?.colo,
      country: request.cf?.country,
      httpProtocol: request.cf?.httpProtocol
    };

    const response = await handleRequest(request);

    monitor.end('cf-request');

    // Add performance headers
    response.headers.set('X-Response-Time', monitor.getDuration('cf-request'));
    response.headers.set('X-Edge-Location', cfMetrics.colo);

    return response;
  }
};
```

### Vercel Edge Functions

```js
import { PerformanceMonitor } from 'edge-utils';

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const monitor = new PerformanceMonitor({
    platform: 'vercel'
  });

  monitor.start('vercel-request');

  try {
    const response = await processRequest(request);

    monitor.end('vercel-request');

    // Add Vercel-specific headers
    response.headers.set('X-Vercel-Response-Time', monitor.getDuration('vercel-request'));

    return response;
  } catch (error) {
    monitor.end('vercel-request');
    throw error;
  }
}
```

## Best Practices

### 1. Monitor Key Metrics

```js
const monitor = new PerformanceMonitor();

// Track key performance indicators
const kpis = {
  responseTime: monitor.histogram('response_time'),
  errorRate: monitor.counter('error_rate'),
  throughput: monitor.counter('requests_total')
};
```

### 2. Implement Circuit Breakers

```js
import { CircuitBreaker } from 'edge-utils';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  monitoringPeriod: 10000
});

const safeRequest = breaker.wrap(async (url) => {
  return await fetch(url);
});
```

### 3. Use Appropriate Timeouts

```js
const timeouts = {
  database: 5000,    // 5 seconds
  externalApi: 10000, // 10 seconds
  fileUpload: 30000   // 30 seconds
};

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeouts.database);

try {
  const response = await fetch('/api/data', {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeoutId);
}
```

## API Reference

### PerformanceMonitor

- `start(label)` - Start timing a operation
- `end(label)` - End timing an operation
- `getDuration(label)` - Get duration of an operation
- `getMemoryUsage()` - Get current memory usage
- `getCpuUsage()` - Get current CPU usage

### ColdStartDetector

- `isColdStart()` - Check if current execution is a cold start
- `getColdStartCount()` - Get number of cold starts
- `reset()` - Reset cold start counter

### StreamingResponse

- `write(data)` - Write data to stream
- `end()` - End the stream
- `getReader()` - Get stream reader

### CompressionManager

- `compress(response, options)` - Compress a response
- `shouldCompress(response)` - Check if response should be compressed
- `getSupportedAlgorithms()` - Get supported compression algorithms