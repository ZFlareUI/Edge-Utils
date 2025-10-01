---
title: "Performance Utils API"
description: "Complete API reference for performance monitoring and optimization utilities"
---

# Performance Utils API Reference

The Performance Utils provide cold start detection, streaming responses, and performance monitoring for edge applications.

## ColdStartDetector

Cold start detection and optimization.

### Constructor

```js
new ColdStartDetector(options)
```

**Parameters:**
- `options` (object): Cold start detection options

### Methods

#### isColdStart()

Check if current execution is a cold start.

```js
if (coldStart.isColdStart()) {
  // Perform warm-up logic
}
```

**Returns:** Boolean indicating cold start

#### getColdStartCount()

Get number of cold starts.

```js
const count = coldStart.getColdStartCount();
```

**Returns:** Number of cold starts

#### reset()

Reset cold start counter.

```js
coldStart.reset();
```

## PerformanceMonitor

Real-time performance monitoring.

### Constructor

```js
new PerformanceMonitor(options)
```

**Parameters:**
- `options` (object): Performance monitoring options

### Methods

#### start(label)

Start timing an operation.

```js
const timerId = monitor.start('database-query');
```

**Parameters:**
- `label` (string): Timer label

**Returns:** Timer identifier

#### end(label)

End timing an operation.

```js
monitor.end('database-query');
```

**Parameters:**
- `label` (string): Timer label

#### getDuration(label)

Get duration of an operation.

```js
const duration = monitor.getDuration('database-query');
```

**Parameters:**
- `label` (string): Timer label

**Returns:** Duration in milliseconds

#### getMemoryUsage()

Get current memory usage.

```js
const memory = monitor.getMemoryUsage();
```

**Returns:** Memory usage in bytes

#### getCpuUsage()

Get current CPU usage.

```js
const cpu = monitor.getCpuUsage();
```

**Returns:** CPU usage percentage

## StreamingResponse

Efficient streaming response handling.

### Constructor

```js
new StreamingResponse()
```

### Methods

#### write(data)

Write data to stream.

```js
stream.write(JSON.stringify(chunk));
```

**Parameters:**
- `data` (string|Uint8Array): Data to write

#### end()

End the stream.

```js
stream.end();
```

#### getReader()

Get stream reader.

```js
const reader = stream.getReader();
```

**Returns:** ReadableStream reader

## CompressionManager

Response compression utilities.

### Constructor

```js
new CompressionManager(options)
```

**Parameters:**
- `options` (object): Compression options

### Methods

#### compress(response, options)

Compress a response.

```js
const compressed = await compression.compress(response, {
  acceptEncoding: 'gzip, deflate'
});
```

**Parameters:**
- `response` (Response): HTTP response
- `options` (object): Compression options

**Returns:** Promise resolving to compressed response

#### shouldCompress(response)

Check if response should be compressed.

```js
if (compression.shouldCompress(response)) {
  // Apply compression
}
```

**Parameters:**
- `response` (Response): HTTP response

**Returns:** Boolean indicating if compression should be applied

## ResourceMonitor

Resource usage monitoring.

### Constructor

```js
new ResourceMonitor(options)
```

**Parameters:**
- `options` (object): Resource monitoring options

### Methods

#### getCurrentUsage()

Get current resource usage.

```js
const usage = resourceMonitor.getCurrentUsage();
// { memory: 67108864, cpu: 45.2 }
```

**Returns:** Resource usage object

#### start()

Start resource monitoring.

```js
resourceMonitor.start();
```

#### stop()

Stop resource monitoring.

```js
resourceMonitor.stop();
```

## Type Definitions

### ColdStartOptions

```typescript
interface ColdStartOptions {
  warmUpThreshold?: number;
  metrics?: boolean;
}
```

### PerformanceMonitorOptions

```typescript
interface PerformanceMonitorOptions {
  platform?: 'cloudflare' | 'vercel' | 'deno';
  collectMemory?: boolean;
  collectCpu?: boolean;
}
```

### CompressionOptions

```typescript
interface CompressionOptions {
  algorithms?: string[];
  threshold?: number;
  level?: number;
}
```

### ResourceUsage

```typescript
interface ResourceUsage {
  memory: number;
  cpu: number;
  timestamp: number;
}
```