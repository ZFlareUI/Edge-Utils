# Security Utilities

The security utilities provide comprehensive security features specifically designed for edge environments, including headers management, CSRF protection, XSS prevention, DDoS mitigation, and request validation.

## Features

- Security Headers: Comprehensive HTTP security headers management
- CSRF Protection: Cross-Site Request Forgery prevention
- XSS Prevention: Cross-Site Scripting attack mitigation
- DDoS Protection: Distributed Denial of Service attack prevention
- Request Validation: JSON Schema-based request validation
- Input Sanitization: Safe input processing and sanitization
- Security Monitoring: Security event logging and monitoring
- Edge Optimized: Low-latency security operations

## Quick Start

```js
const {
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator
} = require('edge-utils/security');

// Security headers
const headersManager = new SecurityHeadersManager({
  contentSecurityPolicy: { enabled: true },
  hsts: { maxAge: 31536000, includeSubDomains: true }
});

// CSRF protection
const csrf = new CSRFProtection({
  secret: 'csrf-secret',
  cookieName: 'csrf-token'
});

// Request validation
const validator = new RequestValidator();
validator.addSchema('user', {
  type: 'object',
  properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' } },
  required: ['name', 'email']
});
```

## SecurityHeadersManager

Comprehensive HTTP security headers management.

### Constructor Options

```js
const headersManager = new SecurityHeadersManager({
  contentSecurityPolicy: {
    enabled: true,
    defaultSrc: "'self'",
    scriptSrc: "'self' 'unsafe-inline'",
    styleSrc: "'self' https://fonts.googleapis.com",
    fontSrc: "'self' https://fonts.gstatic.com",
    imgSrc: "'self' data: https:",
    connectSrc: "'self' https://api.example.com"
  },
  hsts: {
    maxAge: 31536000,              // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameOptions: { action: 'DENY' },
  contentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    geolocation: 'none',
    camera: 'none',
    microphone: 'none',
    payment: 'self'
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin'
});
```

### Header Generation

```js
// Generate all security headers
const headers = headersManager.generate();
console.log(headers);
// Output:
// {
//   'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
//   'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
//   'X-Frame-Options': 'DENY',
//   'X-Content-Type-Options': 'nosniff',
//   'Referrer-Policy': 'strict-origin-when-cross-origin',
//   ...
// }

// Generate specific headers
const cspHeader = headersManager.generateCSP();
const hstsHeader = headersManager.generateHSTS();
```

### Dynamic Headers

```js
// Generate headers based on request context
const headers = headersManager.generate({
  request: request,
  user: context.user,
  nonce: generateNonce()  // For CSP nonces
});

// Conditional headers
if (request.url.includes('/admin')) {
  headersManager.addHeader('X-Admin-Access', 'true');
}
```

## CSRFProtection

Cross-Site Request Forgery protection with double-submit cookie pattern.

### Constructor Options

```js
const csrf = new CSRFProtection({
  secret: 'csrf-secret-key',        // Secret for token signing
  cookieName: 'csrf-token',         // CSRF token cookie name
  headerName: 'x-csrf-token',       // CSRF token header name
  sessionName: 'csrf-secret',       // Session key for secret storage
  ttl: 3600000,                     // Token TTL in milliseconds (1 hour)
  secure: true,                     // Require HTTPS
  httpOnly: false,                  // Allow JavaScript access to cookie
  sameSite: 'strict'                // CSRF protection level
});
```

### Token Generation

```js
// Generate CSRF token
const token = csrf.generateToken(sessionId);

// Set token in response
const response = new Response('Success');
csrf.setTokenCookie(response, token, {
  secure: true,
  httpOnly: false,
  sameSite: 'strict'
});
```

### Token Validation

```js
// Validate CSRF token from request
const isValid = csrf.validateToken(request, sessionId);

if (!isValid) {
  return new Response('CSRF token invalid', { status: 403 });
}

// Validate with custom token
const customToken = request.headers.get('x-custom-csrf-token');
const isValidCustom = csrf.validateToken(request, sessionId, {
  token: customToken,
  headerName: 'x-custom-csrf-token'
});
```

### Middleware Integration

```js
const csrfMiddleware = csrf.middleware({
  excludePaths: ['/api/public'],     // Paths to exclude from CSRF protection
  excludeMethods: ['GET', 'HEAD']    // HTTP methods to exclude
});

const response = await csrfMiddleware(request, context);
```

## XSSPrevention

Cross-Site Scripting attack prevention and input sanitization.

### Constructor Options

```js
const xss = new XSSPrevention({
  sanitizationRules: [
    {
      context: 'html',
      pattern: /<script[^>]*>.*?<\/script>/gi,
      replacement: ''
    },
    {
      context: 'attribute',
      pattern: /javascript:/gi,
      replacement: ''
    }
  ],
  allowedTags: ['p', 'br', 'strong', 'em', 'a'],
  allowedAttributes: ['href', 'title', 'alt'],
  selfClosingTags: ['br', 'img', 'input'],
  encodeHtmlEntities: true
});
```

### Input Sanitization

```js
// Sanitize HTML content
const cleanHtml = xss.sanitize('<script>alert("xss")</script><p>Hello</p>', 'html');

// Sanitize attribute values
const cleanAttr = xss.sanitize('javascript:alert("xss")', 'attribute');

// Sanitize URL parameters
const cleanUrl = xss.sanitizeUrl('https://example.com?param=<script>alert(1)</script>');
```

### Content Validation

```js
// Validate content against rules
const isSafe = xss.validate('<p>Safe content</p>', 'html');
const isUnsafe = xss.validate('<script>alert("xss")</script>', 'html');

console.log(isSafe);   // true
console.log(isUnsafe); // false
```

## RequestValidator

JSON Schema-based request validation with comprehensive error reporting.

### Constructor Options

```js
const validator = new RequestValidator({
  ajvOptions: {
    allErrors: true,              // Report all validation errors
    removeAdditional: true,       // Remove additional properties
    useDefaults: true,            // Apply default values
    coerceTypes: true             // Coerce types when possible
  },
  customFormats: {
    'phone': /^[\+]?[1-9][\d]{0,15}$/,
    'postal-code': /^[A-Z\d]{3,10}$/
  },
  errorFormatter: (errors) => {
    return errors.map(error => ({
      field: error.instancePath,
      message: error.message,
      code: error.keyword
    }));
  }
});
```

### Schema Management

```js
// Add validation schema
validator.addSchema('user', {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0, maximum: 150 },
    phone: { type: 'string', format: 'phone' }
  },
  required: ['name', 'email']
});

// Add nested schema
validator.addSchema('address', {
  type: 'object',
  properties: {
    street: { type: 'string' },
    city: { type: 'string' },
    postalCode: { type: 'string', format: 'postal-code' },
    country: { type: 'string', enum: ['US', 'CA', 'UK'] }
  },
  required: ['street', 'city', 'country']
});

// Reference schemas
validator.addSchema('userWithAddress', {
  type: 'object',
  properties: {
    ...validator.getSchema('user').properties,
    address: validator.getSchema('address')
  },
  required: ['name', 'email', 'address']
});
```

### Request Validation

```js
// Validate request body
const result = validator.validate(request, 'user');

if (!result.valid) {
  return new Response(JSON.stringify({
    error: 'Validation failed',
    details: result.errors
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Validate with custom data
const customResult = validator.validate({ name: 'John', email: 'invalid' }, 'user');
console.log(customResult.errors);
// Output: [{ field: '/email', message: 'must match format "email"', code: 'format' }]
```

### Advanced Validation

```js
// Conditional validation
validator.addSchema('product', {
  type: 'object',
  properties: {
    type: { enum: ['physical', 'digital'] },
    weight: { type: 'number' },
    downloadUrl: { type: 'string', format: 'uri' }
  },
  required: ['type'],
  if: { properties: { type: { const: 'physical' } } },
  then: { required: ['weight'] },
  else: { required: ['downloadUrl'] }
});

// Cross-field validation
validator.addSchema('passwordChange', {
  type: 'object',
  properties: {
    currentPassword: { type: 'string' },
    newPassword: { type: 'string', minLength: 8 },
    confirmPassword: { type: 'string' }
  },
  required: ['currentPassword', 'newPassword', 'confirmPassword']
}, {
  customKeywords: {
    passwordMatch: (schema, data) => {
      return data.newPassword === data.confirmPassword;
    }
  }
});
```

## DDoSProtection

Distributed Denial of Service attack prevention and mitigation.

### Constructor Options

```js
const ddos = new DDoSProtection({
  spikeThreshold: 100,              // Requests per minute threshold
  blockDuration: 15 * 60 * 1000,    // Block duration in ms (15 minutes)
  challengeEnabled: true,           // Enable challenge-response
  challengeDifficulty: 4,           // Proof-of-work difficulty
  whitelist: ['192.168.1.0/24'],    // IP whitelist (CIDR notation)
  blacklist: [],                    // IP blacklist
  storage: kvStorage,               // Distributed storage for state
  monitoring: true                  // Enable monitoring
});
```

### Request Filtering

```js
// Check if request should be blocked
const shouldBlock = await ddos.shouldBlock(request);

if (shouldBlock.blocked) {
  if (shouldBlock.challenge) {
    // Return challenge response
    return ddos.createChallengeResponse(shouldBlock.challenge);
  } else {
    // Return block response
    return new Response('Access denied', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil(shouldBlock.retryAfter / 1000)
      }
    });
  }
}
```

### Challenge-Response

```js
// Verify challenge response
const isValid = ddos.verifyChallenge(request, challengeData);

if (!isValid) {
  return new Response('Invalid challenge', { status: 400 });
}

// Create new challenge
const challenge = ddos.createChallenge({
  difficulty: 4,
  timeout: 300000  // 5 minutes
});

return new Response(JSON.stringify(challenge), {
  headers: { 'Content-Type': 'application/json' }
});
```

### Monitoring and Analytics

```js
// Get DDoS statistics
const stats = ddos.getStats();
console.log({
  totalRequests: stats.totalRequests,
  blockedRequests: stats.blockedRequests,
  activeBlocks: stats.activeBlocks,
  topAttackers: stats.topAttackers
});

// Get attack patterns
const patterns = ddos.getAttackPatterns();
console.log(patterns);
// Output: [{ type: 'spike', source: '192.168.1.1', intensity: 150 }]
```

## Security Monitoring

### Security Event Logging

```js
const { SecurityMonitor } = require('edge-utils/security');

const monitor = new SecurityMonitor({
  storage: kvStorage,
  retention: 30 * 24 * 60 * 60 * 1000,  // 30 days
  alertThresholds: {
    failedLogins: 5,
    suspiciousRequests: 10,
    blockedIPs: 3
  }
});

// Log security events
monitor.logEvent({
  type: 'failed_login',
  severity: 'medium',
  source: request.ip,
  details: { username: 'admin' }
});

monitor.logEvent({
  type: 'suspicious_request',
  severity: 'high',
  source: request.ip,
  details: { path: '/admin', method: 'POST' }
});

// Get security reports
const report = await monitor.getReport({
  since: new Date(Date.now() - 24 * 60 * 60 * 1000),  // Last 24 hours
  type: 'failed_login'
});

console.log(`Failed login attempts: ${report.events.length}`);
```

### Real-time Alerts

```js
// Set up alert handlers
monitor.onAlert('failed_logins', (alert) => {
  console.log(`Alert: ${alert.count} failed logins from ${alert.source}`);
  // Send notification, block IP, etc.
});

monitor.onAlert('suspicious_activity', (alert) => {
  console.log(`Suspicious activity detected: ${alert.details}`);
});

// Process alerts
await monitor.processAlerts();
```

## Middleware Integration

### Complete Security Middleware Chain

```js
const {
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator,
  DDoSProtection,
  SecurityMonitor
} = require('edge-utils/security');

// Initialize security components
const headersManager = new SecurityHeadersManager({
  contentSecurityPolicy: { enabled: true },
  hsts: { maxAge: 31536000, includeSubDomains: true }
});

const csrf = new CSRFProtection({
  secret: process.env.CSRF_SECRET
});

const xss = new XSSPrevention();

const validator = new RequestValidator();
validator.addSchema('login', {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3 },
    password: { type: 'string', minLength: 8 }
  },
  required: ['username', 'password']
});

const ddos = new DDoSProtection({
  spikeThreshold: 100,
  blockDuration: 15 * 60 * 1000
});

const monitor = new SecurityMonitor({
  storage: kvStorage
});

// Security middleware chain
const securityMiddleware = [
  // DDoS protection (first)
  ddos.middleware(),

  // Security monitoring
  async (request, context) => {
    const startTime = Date.now();

    try {
      // Continue to next middleware
      const response = await context.next();

      // Log successful request
      monitor.logEvent({
        type: 'request',
        severity: 'low',
        source: getClientIP(request),
        details: {
          method: request.method,
          path: request.url,
          status: response.status,
          duration: Date.now() - startTime
        }
      });

      return response;
    } catch (error) {
      // Log failed request
      monitor.logEvent({
        type: 'error',
        severity: 'medium',
        source: getClientIP(request),
        details: {
          method: request.method,
          path: request.url,
          error: error.message
        }
      });

      throw error;
    }
  },

  // CSRF protection
  csrf.middleware(),

  // Input validation
  async (request, context) => {
    if (request.method === 'POST' && request.url.includes('/api/')) {
      try {
        const body = await request.json();

        // Validate request
        const validation = validator.validate(body, 'login');
        if (!validation.valid) {
          monitor.logEvent({
            type: 'validation_error',
            severity: 'medium',
            source: getClientIP(request),
            details: { errors: validation.errors }
          });

          return new Response(JSON.stringify({
            error: 'Validation failed',
            details: validation.errors
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Sanitize input
        const sanitizedBody = {};
        for (const [key, value] of Object.entries(body)) {
          sanitizedBody[key] = typeof value === 'string' ? xss.sanitize(value) : value;
        }

        // Replace request body
        request = new Request(request.url, {
          ...request,
          body: JSON.stringify(sanitizedBody)
        });

      } catch (error) {
        return new Response('Invalid JSON', { status: 400 });
      }
    }

    return await context.next();
  },

  // Security headers (last)
  async (request, context) => {
    const response = await context.next();

    // Add security headers
    const securityHeaders = headersManager.generate({
      request,
      nonce: generateNonce()
    });

    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }
];

// Apply security middleware
const secureHandler = applyMiddleware(securityMiddleware, baseHandler);
```

## Performance Considerations

### Security Overhead

```js
// Measure security processing time
const securityTimer = new PerformanceTimer();

const secureResponse = await securityTimer.time(async () => {
  return await applySecurityMiddleware(request);
});

console.log(`Security processing: ${securityTimer.duration}ms`);

// Optimize for high-throughput scenarios
const optimizedSecurity = new OptimizedSecurityChain({
  cache: new MemoryCache({ ttl: 300 }),  // Cache validation results
  parallelProcessing: true,               // Process security checks in parallel
  earlyExit: true                         // Exit on first failure
});
```

### Memory Management

```js
// Implement security state cleanup
setInterval(() => {
  // Clean up expired CSRF tokens
  csrf.cleanup();

  // Clean up old security events
  monitor.cleanup();

  // Clean up DDoS tracking data
  ddos.cleanup();
}, 60 * 60 * 1000); // Hourly cleanup
```

## Platform-Specific Notes

### Cloudflare Workers
- Compatible with Cloudflare security features
- Use Cloudflare KV for distributed security state
- Leverage Cloudflare's DDoS protection

### Vercel Edge Functions
- Compatible with Vercel's security headers
- Use Edge Config for security configuration
- Support for Vercel's bot protection

### Deno Deploy
- Native performance with Deno runtime
- Compatible with Deno KV for security state
- Support for Web Crypto API

## Security Best Practices

### Defense in Depth

```js
// Implement multiple layers of security
const defenseLayers = {
  network: ddosProtection,
  application: inputValidation,
  session: csrfProtection,
  output: xssPrevention,
  monitoring: securityLogging
};

// Apply all layers
const fullySecureHandler = applyAllSecurityLayers(defenseLayers, baseHandler);
```

### Security Headers Configuration

```js
// Production-ready security headers
const productionHeaders = new SecurityHeadersManager({
  contentSecurityPolicy: {
    enabled: true,
    defaultSrc: "'none'",
    scriptSrc: "'self' 'nonce-abc123'",
    styleSrc: "'self' 'nonce-def456'",
    imgSrc: "'self' data: https:",
    fontSrc: "'self' https://fonts.gstatic.com",
    connectSrc: "'self' https://api.example.com",
    frameAncestors: "'none'"
  },
  hsts: {
    maxAge: 63072000,  // 2 years
    includeSubDomains: true,
    preload: true
  },
  frameOptions: { action: 'DENY' },
  contentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    geolocation: 'none',
    camera: 'none',
    microphone: 'none',
    payment: 'self',
    usb: 'none'
  }
});
```

### Incident Response

```js
// Automated incident response
const incidentResponse = new IncidentResponse({
  triggers: {
    'high_severity_alert': (alert) => {
      // Auto-block IP
      ddos.blockIP(alert.source);
      // Send notification
      sendAlertNotification(alert);
      // Log incident
      monitor.logIncident(alert);
    },
    'ddos_attack': (attack) => {
      // Enable emergency mode
      enableEmergencyMode();
      // Scale up resources
      scaleResources();
    }
  }
});
```

## Testing

Run security tests with:

```bash
npm test -- --testPathPattern=security.test.js
```

## API Reference

### SecurityHeadersManager Methods
- `generate(options)` - Generate security headers
- `generateCSP(options)` - Generate CSP header
- `generateHSTS(options)` - Generate HSTS header
- `addHeader(name, value)` - Add custom header

### CSRFProtection Methods
- `generateToken(sessionId)` - Generate CSRF token
- `validateToken(request, sessionId, options)` - Validate CSRF token
- `setTokenCookie(response, token, options)` - Set token cookie
- `middleware(options)` - CSRF middleware

### XSSPrevention Methods
- `sanitize(input, context)` - Sanitize input
- `sanitizeUrl(url)` - Sanitize URL
- `validate(input, context)` - Validate input safety

### RequestValidator Methods
- `addSchema(name, schema, options)` - Add validation schema
- `validate(data, schemaName)` - Validate data
- `getSchema(name)` - Get schema by name

### DDoSProtection Methods
- `shouldBlock(request)` - Check if request should be blocked
- `createChallenge(options)` - Create challenge
- `verifyChallenge(request, challenge)` - Verify challenge response
- `blockIP(ip, duration)` - Block IP address
- `getStats()` - Get DDoS statistics

### SecurityMonitor Methods
- `logEvent(event)` - Log security event
- `getReport(options)` - Get security report
- `onAlert(type, handler)` - Set alert handler
- `processAlerts()` - Process pending alerts

## Contributing

When contributing to security utilities:

1. Follow security best practices
2. Add comprehensive security tests
3. Update documentation for security features
4. Consider performance impact of security measures
5. Test across all supported platforms

## License

MIT