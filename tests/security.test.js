/**
 * Security Tests
 * @jest-environment node
 */

const {
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator,
  DDoSProtection
} = require('../src/security');

describe('SecurityHeadersManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SecurityHeadersManager();
  });

  test('generates security headers', () => {
    const headers = manager.generate({
      csp: true,
      hsts: true,
      noSniff: true,
      frameOptions: 'DENY'
    });

    expect(headers).toHaveProperty('Content-Security-Policy');
    expect(headers).toHaveProperty('Strict-Transport-Security');
    expect(headers).toHaveProperty('X-Content-Type-Options');
    expect(headers).toHaveProperty('X-Frame-Options');
  });

  test('generates CSP with custom directives', () => {
    const headers = manager.generate({
      csp: {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline'",
        'style-src': "'self' https://fonts.googleapis.com"
      }
    });

    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-inline'");
  });

  test('generates nonce for CSP', () => {
    const nonce = SecurityHeadersManager.generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });
});

describe('CSRFProtection', () => {
  let csrf;

  beforeEach(() => {
    csrf = new CSRFProtection({
      secret: 'test-secret',
      cookieName: 'csrf-token'
    });
  });

  test('generates CSRF token', () => {
    const token = csrf.generateToken('session-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('validates correct CSRF token', () => {
    const token = csrf.generateToken('session-123');
    const isValid = csrf.verifyToken(token, 'session-123');
    expect(isValid).toBe(true);
  });

  test('rejects invalid CSRF token', () => {
    const isValid = csrf.verifyToken('invalid-token', 'session-123');
    expect(isValid).toBe(false);
  });

  test('rejects token for wrong session', () => {
    const token = csrf.generateToken('session-123');
    const isValid = csrf.verifyToken(token, 'session-456');
    expect(isValid).toBe(false);
  });
});

describe('XSSPrevention', () => {
  let xss;

  beforeEach(() => {
    xss = new XSSPrevention();
  });

  test('sanitizes script tags', () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = xss.sanitize(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toBe(''); // Script tags are completely removed
  });

  test('sanitizes event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const sanitized = xss.sanitize(input);
    expect(sanitized).not.toContain('onerror');
  });

  test('allows safe HTML', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const sanitized = xss.sanitize(input);
    expect(sanitized).toBe(input);
  });

  test('detects script injection', () => {
    const input = '<script>alert("xss")</script>';
    const detected = xss.detectScriptInjection(input);
    expect(detected).toBe(true);

    const safeInput = '<p>Hello world</p>';
    const notDetected = xss.detectScriptInjection(safeInput);
    expect(notDetected).toBe(false);
  });
});

describe('RequestValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new RequestValidator();
  });

  test('validates request against schema', () => {
    const schema = {
      type: 'object',
      properties: {
        method: { type: 'string' },
        url: { type: 'string' },
        headers: { type: 'object' },
        query: { type: 'object' },
        body: { type: 'object' }
      }
    };

    validator.addSchema('test', schema);

    const mockRequest = {
      method: 'POST',
      url: 'https://example.com/api',
      headers: { 'content-type': 'application/json' },
      body: { name: 'John', age: 30 }
    };

    const result = validator.validate(mockRequest, 'test');
    expect(result.valid).toBe(true);
  });

  test('returns validation errors', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2 }
      },
      required: ['name']
    };

    const errors = validator.validateJSON({ name: 'A' }, schema);
    expect(errors.valid).toBe(false);
    expect(errors.errors).toBeDefined();
    expect(Array.isArray(errors.errors)).toBe(true);
    expect(errors.errors.length).toBeGreaterThan(0);
  });
});

describe('DDoSProtection', () => {
  let ddos;

  beforeEach(() => {
    ddos = new DDoSProtection({
      maxRequestsPerMinute: 100,
      blockDuration: 60000 // 1 minute
    });
  });

  test('allows normal traffic', () => {
    const analysis = ddos.analyze({ headers: {} });
    expect(analysis.suspicious).toBe(false);
    expect(analysis.block).toBe(false);
  });

  test('blocks suspicious traffic patterns', () => {
    // Simulate high frequency requests
    for (let i = 0; i < 150; i++) {
      ddos.analyze({ headers: {} });
    }

    const analysis = ddos.analyze({ headers: {} });
    expect(analysis.suspicious).toBe(true);
    expect(analysis.block).toBe(true);
  });

  test('generates challenge response', () => {
    const challenge = ddos.generateChallenge();
    expect(challenge.status).toBe(403);
    expect(challenge.headers.get('Content-Type')).toBe('text/html');
    expect(challenge.headers.get('X-Challenge-ID')).toBeDefined();
  });
});