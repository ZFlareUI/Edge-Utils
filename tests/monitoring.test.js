/**
 * Monitoring Tests
 * @jest-environment node
 */

const {
  MetricsCollector,
  StructuredLogger,
  TracingManager,
  HealthCheckManager
} = require('../src/monitoring');

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  test('records counter metrics', () => {
    collector.increment('requests_total', 1, { method: 'GET', status: '200' });
    collector.increment('requests_total', 1, { method: 'GET', status: '200' });

    const counter = collector.getCounter('requests_total', { method: 'GET', status: '200' });
    expect(counter).toBe(2);
  });

  test('records gauge metrics', () => {
    collector.gauge('active_connections', 10);
    collector.gauge('active_connections', 15);

    const gauge = collector.getGauge('active_connections');
    expect(gauge).toBe(15);
  });

  test('records histogram metrics', () => {
    collector.histogram('request_duration', 0.1, { endpoint: '/api' });
    collector.histogram('request_duration', 0.2, { endpoint: '/api' });
    collector.histogram('request_duration', 0.3, { endpoint: '/api' });

    const percentiles = collector.getHistogramPercentiles('request_duration', { endpoint: '/api' });
    expect(percentiles.p50).toBeDefined();
    expect(percentiles.p95).toBeDefined();
    expect(percentiles.p99).toBeDefined();
  });

  test('calculates percentiles', () => {
    for (let i = 1; i <= 100; i++) {
      collector.histogram('response_time', i * 0.01);
    }

    const percentiles = collector.getHistogramPercentiles('response_time');
    expect(percentiles.p50).toBeGreaterThan(0);
    expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
    expect(percentiles.p99).toBeGreaterThan(percentiles.p95);
  });

  test('returns all metrics', () => {
    collector.increment('test_counter');
    collector.gauge('test_gauge', 42);
    collector.histogram('test_histogram', 1.5);

    const metrics = collector.getAllMetrics();
    expect(metrics.counters).toBeDefined();
    expect(metrics.gauges).toBeDefined();
    expect(metrics.histograms).toBeDefined();
  });
});

describe('StructuredLogger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = new StructuredLogger({
      level: 'info',
      format: 'json'
    });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('logs info messages', () => {
    logger.info('Test message', { userId: '123' });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.level).toBe('info');
    expect(loggedData.message).toBe('Test message');
    expect(loggedData.userId).toBe('123');
    expect(loggedData.timestamp).toBeDefined();
  });

  test('logs error messages', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', { requestId: 'req-123' });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.level).toBe('error');
    expect(loggedData.message).toBe('Error occurred');
  });

  test('respects log levels', () => {
    const debugLogger = new StructuredLogger({ level: 'warn' });
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    debugLogger.debug('Debug message');
    expect(debugSpy).not.toHaveBeenCalled();

    debugLogger.warn('Warn message');
    expect(consoleSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
  });

  test('creates child logger', () => {
    const childLogger = logger.child({ requestId: 'req-123' });
    childLogger.info('Child message');

    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.requestId).toBe('req-123');
  });
});

describe('TracingManager', () => {
  let tracer;

  beforeEach(() => {
    tracer = new TracingManager();
  });

  test('starts a new span', () => {
    const span = tracer.startSpan('test-operation', null, { service: 'edge-utils' });

    expect(span.traceId).toBeDefined();
    expect(span.spanId).toBeDefined();
    expect(span.version).toBe('00');
    expect(span.flags).toBeDefined();
  });

  test('creates child spans', () => {
    const rootSpan = tracer.startSpan('root');
    const childSpan = tracer.startSpan('child', rootSpan);

    expect(childSpan.traceId).toBe(rootSpan.traceId);
    expect(childSpan.parentId).toBe(rootSpan.spanId);
  });

  test('ends spans', () => {
    const span = tracer.startSpan('test');
    tracer.endSpan(span.spanId);

    // The span should be removed from active spans
    expect(tracer.activeSpans.has(span.spanId)).toBe(false);
  });

  test('adds events to spans', () => {
    const span = tracer.startSpan('test');
    tracer.addEvent(span.spanId, 'Processing started', { step: 1 });

    const spanData = tracer.spans.get(span.spanId);
    expect(spanData.events.length).toBe(1);
    expect(spanData.events[0].name).toBe('Processing started');
  });

  test('extracts trace context from headers', () => {
    const headers = {
      'traceparent': '00-12345678901234567890123456789012-1234567890123456-01',
      'tracestate': 'key=value'
    };

    const context = tracer.extract(headers);
    expect(context.traceId).toBe('12345678901234567890123456789012');
    expect(context.parentId).toBe('1234567890123456');
    expect(context.flags).toBe('01');
    expect(context.state).toBe('key=value');
  });

  test('injects trace context into headers', () => {
    const context = {
      version: '00',
      traceId: '12345678901234567890123456789012',
      spanId: '1234567890123456',
      flags: '01',
      state: 'key=value'
    };

    const headers = {};
    tracer.inject(context, headers);

    expect(headers['traceparent']).toBe('00-12345678901234567890123456789012-1234567890123456-01');
    expect(headers['tracestate']).toBe('key=value');
  });
});

describe('HealthCheckManager', () => {
  let healthManager;

  beforeEach(() => {
    healthManager = new HealthCheckManager();
  });

  test('adds health checks', () => {
    healthManager.addCheck('database', async () => ({ healthy: true }));
    healthManager.addCheck('cache', async () => ({ healthy: true, latency: 10 }));

    expect(healthManager.checks.size).toBe(2);
  });

  test('runs all health checks', async () => {
    healthManager.addCheck('service1', async () => ({ healthy: true }));
    healthManager.addCheck('service2', async () => ({ healthy: false, error: 'Connection failed' }));

    const results = await healthManager.runChecks();

    expect(results.status).toBe('unhealthy');
    expect(results.checks.service1.healthy).toBe(true);
    expect(results.checks.service2.healthy).toBe(false);
    expect(results.checks.service2.error).toBe('Connection failed');
  });

  test('returns healthy status when all checks pass', async () => {
    healthManager.addCheck('service1', async () => ({ healthy: true }));
    healthManager.addCheck('service2', async () => ({ healthy: true }));

    const results = await healthManager.runChecks();
    expect(results.status).toBe('healthy');
  });

  test('handles check timeouts', async () => {
    healthManager.addCheck('slow-service', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { healthy: true };
    });

    const results = await healthManager.runChecks();
    expect(results.checks['slow-service'].healthy).toBe(true);
  });

  test('provides liveness status', () => {
    const liveness = healthManager.getLiveness();
    expect(liveness.status).toBe('healthy');
    expect(liveness.timestamp).toBeDefined();
    expect(liveness.uptime).toBeDefined();
  });

  test('provides readiness status', async () => {
    healthManager.addCheck('test', async () => ({ healthy: true }));

    const readiness = await healthManager.getReadiness();
    expect(readiness.status).toBe('healthy');
    expect(readiness.checks.test.healthy).toBe(true);
  });
});