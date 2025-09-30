/**
 * Advanced Security Module for Edge Computing
 * @module edge-utils/security
 */

const crypto = require('crypto');
const Ajv = require('ajv');

/**
 * Security Headers Manager
 * Manages various security headers for HTTP responses
 */
class SecurityHeadersManager {
  constructor(options = {}) {
    this.options = {
      contentSecurityPolicy: options.contentSecurityPolicy || {},
      hsts: options.hsts || { maxAge: 31536000, includeSubDomains: true },
      frameOptions: options.frameOptions || { action: 'DENY' },
      contentTypeOptions: 'nosniff',
      referrerPolicy: options.referrerPolicy || 'strict-origin-when-cross-origin',
      permissionsPolicy: options.permissionsPolicy || {},
      coop: options.coop || 'same-origin',
      coep: options.coep || 'require-corp',
      ...options
    };
  }

  /**
   * Generate all security headers
   * @param {Object} overrides - Override specific headers
   * @returns {Object} - Headers object
   */
  generate(overrides = {}) {
    const headers = {};

    // Content Security Policy
    if (this.options.contentSecurityPolicy.enabled !== false) {
      headers['Content-Security-Policy'] = this._generateCSP(overrides.csp);
    }

    // HTTP Strict Transport Security
    if (this.options.hsts.enabled !== false) {
      headers['Strict-Transport-Security'] = this._generateHSTS();
    }

    // X-Frame-Options
    if (this.options.frameOptions.enabled !== false) {
      headers['X-Frame-Options'] = this._generateFrameOptions();
    }

    // X-Content-Type-Options
    headers['X-Content-Type-Options'] = this.options.contentTypeOptions;

    // Referrer-Policy
    headers['Referrer-Policy'] = this.options.referrerPolicy;

    // Permissions-Policy
    if (Object.keys(this.options.permissionsPolicy).length > 0) {
      headers['Permissions-Policy'] = this._generatePermissionsPolicy();
    }

    // Cross-Origin-Embedder-Policy
    if (this.options.coep) {
      headers['Cross-Origin-Embedder-Policy'] = this.options.coep;
    }

    // Cross-Origin-Opener-Policy
    if (this.options.coop) {
      headers['Cross-Origin-Opener-Policy'] = this.options.coop;
    }

    // Apply header overrides (excluding csp which is handled above)
    const { csp, ...headerOverrides } = overrides;
    return { ...headers, ...headerOverrides };
  }

  /**
   * Generate Content Security Policy header
   * @private
   * @param {Object} overrides - CSP directive overrides
   * @returns {string}
   */
  _generateCSP(overrides = {}) {
    const csp = { ...this.options.contentSecurityPolicy, ...overrides };
    const directives = [];

    // Default src directives
    directives.push(`default-src ${csp['default-src'] || "'self'"}`);
    directives.push(`script-src ${csp['script-src'] || "'self'"}`);
    directives.push(`style-src ${csp['style-src'] || "'self' 'unsafe-inline'"}`);
    directives.push(`img-src ${csp['img-src'] || "'self' data: https:"}`);
    directives.push(`font-src ${csp['font-src'] || "'self'"}`);
    directives.push(`connect-src ${csp['connect-src'] || "'self'"}`);
    directives.push(`media-src ${csp['media-src'] || "'self'"}`);
    directives.push(`object-src ${csp['object-src'] || "'none'"}`);
    directives.push(`frame-src ${csp['frame-src'] || "'none'"}`);

    // Add nonce for scripts if provided
    if (csp.nonce) {
      directives.push(`script-src 'self' 'nonce-${csp.nonce}'`);
    }

    return directives.join('; ');
  }

  /**
   * Generate HSTS header
   * @private
   * @returns {string}
   */
  _generateHSTS() {
    const hsts = this.options.hsts;
    let header = `max-age=${hsts.maxAge}`;

    if (hsts.includeSubDomains) {
      header += '; includeSubDomains';
    }

    if (hsts.preload) {
      header += '; preload';
    }

    return header;
  }

  /**
   * Generate X-Frame-Options header
   * @private
   * @returns {string}
   */
  _generateFrameOptions() {
    const fo = this.options.frameOptions;

    if (fo.action === 'ALLOW-FROM') {
      return `ALLOW-FROM ${fo.origin}`;
    }

    return fo.action || 'DENY';
  }

  /**
   * Generate Permissions-Policy header
   * @private
   * @returns {string}
   */
  _generatePermissionsPolicy() {
    const policies = [];

    for (const [directive, allowlist] of Object.entries(this.options.permissionsPolicy)) {
      if (Array.isArray(allowlist)) {
        policies.push(`${directive}=(${allowlist.join(' ')})`);
      } else {
        policies.push(`${directive}=${allowlist}`);
      }
    }

    return policies.join(', ');
  }

  /**
   * Generate CSP nonce
   * @returns {string}
   */
  static generateNonce() {
    return crypto.randomBytes(16).toString('base64');
  }
}

/**
 * CSRF Protection Manager
 */
class CSRFProtection {
  constructor(options = {}) {
    this.secret = options.secret || crypto.randomBytes(32).toString('hex');
    this.cookieName = options.cookieName || 'csrf-token';
    this.headerName = options.headerName || 'x-csrf-token';
    this.sameSite = options.sameSite || 'strict';
    this.secure = options.secure !== false;
    this.httpOnly = options.httpOnly !== false;
  }

  /**
   * Generate CSRF token
   * @param {string} sessionId
   * @returns {string}
   */
  generateToken(sessionId) {
    const payload = `${sessionId}:${Date.now()}`;
    const signature = crypto.createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Verify CSRF token
   * @param {string} token
   * @param {string} sessionId
   * @returns {boolean}
   */
  verifyToken(token, sessionId) {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [tokenSessionId, timestamp, signature] = decoded.split(':');

      // Check session ID
      if (tokenSessionId !== sessionId) {
        return false;
      }

      // Check expiration (5 minutes)
      if (Date.now() - parseInt(timestamp) > 300000) {
        return false;
      }

      // Verify signature
      const payload = `${tokenSessionId}:${timestamp}`;
      const expectedSignature = crypto.createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Get CSRF cookie options
   * @returns {Object}
   */
  getCookieOptions() {
    return {
      name: this.cookieName,
      value: '', // Set by application
      httpOnly: this.httpOnly,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/'
    };
  }

  /**
   * Middleware for CSRF protection
   * @returns {Function}
   */
  middleware() {
    return (request, context) => {
      const method = request.method?.toUpperCase();

      // Skip GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return null;
      }

      const token = request.headers?.[this.headerName.toLowerCase()] ||
                   request.headers?.['x-xsrf-token'];

      if (!token) {
        return new Response('CSRF token missing', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      const sessionId = context.session?.id || 'anonymous';
      if (!this.verifyToken(token, sessionId)) {
        return new Response('CSRF token invalid', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      return null;
    };
  }
}

/**
 * XSS Prevention Manager
 */
class XSSPrevention {
  constructor(options = {}) {
    this.sanitizationRules = options.sanitizationRules || {};
    this.outputEncoding = options.outputEncoding || {};
  }

  /**
   * Sanitize input data
   * @param {string} input
   * @param {string} context - 'html', 'javascript', 'url'
   * @returns {string}
   */
  sanitize(input, context = 'html') {
    if (typeof input !== 'string') return input;

    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Apply custom rules
    const rules = this.sanitizationRules[context] || [];
    for (const rule of rules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }

    // Context-specific sanitization
    switch (context) {
      case 'html':
        sanitized = this._sanitizeHTML(sanitized);
        break;
      case 'javascript':
        sanitized = this._sanitizeJavaScript(sanitized);
        break;
      case 'url':
        sanitized = this._sanitizeURL(sanitized);
        break;
    }

    return sanitized;
  }

  /**
   * Encode output for safe display
   * @param {string} output
   * @param {string} context
   * @returns {string}
   */
  encode(output, context = 'html') {
    if (typeof output !== 'string') return output;

    switch (context) {
      case 'html':
        return output
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      case 'javascript':
        return output
          .replace(/\\/g, '\\\\')
          .replace(/'/g, '\\\'')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      case 'url':
        return encodeURIComponent(output);
      default:
        return output;
    }
  }

  /**
   * Validate content type
   * @param {string} contentType
   * @param {Buffer|string} content
   * @returns {boolean}
   */
  validateContentType(contentType, content) {
    if (!contentType || !content) return false;

    const type = contentType.toLowerCase();

    if (type.includes('json')) {
      try {
        JSON.parse(content.toString());
        return true;
      } catch (e) {
        return false;
      }
    }

    if (type.includes('xml')) {
      // Basic XML validation
      const xmlPattern = /^<\?xml.*?\?>.*<.*>.*<\/.*>$/s;
      return xmlPattern.test(content.toString());
    }

    return true; // Allow other types
  }

  /**
   * Detect script injection
   * @param {string} input
   * @returns {boolean}
   */
  detectScriptInjection(input) {
    if (typeof input !== 'string') return false;

    const patterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /eval\s*\(/gi
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize HTML content
   * @private
   * @param {string} html
   * @returns {string}
   */
  _sanitizeHTML(html) {
    // Remove script tags
    html = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
    // Remove event handlers
    html = html.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
    html = html.replace(/on\w+\s*=\s*'[^']*'/gi, '');
    return html;
  }

  /**
   * Sanitize JavaScript content
   * @private
   * @param {string} js
   * @returns {string}
   */
  _sanitizeJavaScript(js) {
    // Remove dangerous functions
    js = js.replace(/\beval\s*\(/gi, '');
    js = js.replace(/\bFunction\s*\(/gi, '');
    js = js.replace(/\bsetTimeout\s*\(/gi, '');
    js = js.replace(/\bsetInterval\s*\(/gi, '');
    return js;
  }

  /**
   * Sanitize URL content
   * @private
   * @param {string} url
   * @returns {string}
   */
  _sanitizeURL(url) {
    // Remove javascript: and vbscript: protocols
    url = url.replace(/^javascript:/i, '');
    url = url.replace(/^vbscript:/i, '');
    return url;
  }
}

/**
 * Request Validation Manager
 */
class RequestValidator {
  constructor(options = {}) {
    this.ajv = new Ajv(options.ajvOptions || {});
    this.schemas = new Map();
    this.maxBodySize = options.maxBodySize || 10 * 1024 * 1024; // 10MB
    this.allowedContentTypes = options.allowedContentTypes || [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ];
  }

  /**
   * Add validation schema
   * @param {string} name
   * @param {Object} schema
   */
  addSchema(name, schema) {
    this.schemas.set(name, this.ajv.compile(schema));
  }

  /**
   * Validate request
   * @param {Object} request
   * @param {string} schemaName
   * @returns {Object} - { valid, errors }
   */
  validate(request, schemaName) {
    const validate = this.schemas.get(schemaName);
    if (!validate) {
      return { valid: false, errors: [{ message: `Schema not found: ${schemaName}` }] };
    }

    const data = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      query: this._parseQuery(request.url),
      body: request.body
    };

    const valid = validate(data);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Validate JSON schema
   * @param {any} data
   * @param {Object} schema
   * @returns {Object}
   */
  validateJSON(data, schema) {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Validate query parameters
   * @param {Object} query
   * @param {Object} rules
   * @returns {Object}
   */
  validateQuery(query, rules) {
    const errors = [];

    for (const [key, rule] of Object.entries(rules)) {
      const value = query[key];

      if (rule.required && (value === undefined || value === null)) {
        errors.push({ field: key, message: 'Required field missing' });
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type checking
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push({ field: key, message: 'Must be a string' });
        } else if (rule.type === 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({ field: key, message: 'Must be a number' });
          } else if (rule.min !== undefined && num < rule.min) {
            errors.push({ field: key, message: `Must be >= ${rule.min}` });
          } else if (rule.max !== undefined && num > rule.max) {
            errors.push({ field: key, message: `Must be <= ${rule.max}` });
          }
        } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
          // Handle string booleans
          if (value !== 'true' && value !== 'false') {
            errors.push({ field: key, message: 'Must be a boolean' });
          }
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string') {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            errors.push({ field: key, message: 'Invalid format' });
          }
        }

        // Sanitization
        if (rule.sanitize && typeof value === 'string') {
          query[key] = value.trim();
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: query
    };
  }

  /**
   * Validate path parameters
   * @param {Object} params
   * @param {Object} rules
   * @returns {Object}
   */
  validatePath(params, rules) {
    const errors = [];

    for (const [key, rule] of Object.entries(rules)) {
      const value = params[key];

      if (rule.required && (value === undefined || value === null)) {
        errors.push({ field: key, message: 'Required parameter missing' });
        continue;
      }

      if (value !== undefined && value !== null) {
        // Pattern validation for path params
        if (rule.pattern) {
          const regex = new RegExp(`^${rule.pattern}$`);
          if (!regex.test(value)) {
            errors.push({ field: key, message: 'Invalid parameter format' });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate headers
   * @param {Object} headers
   * @param {Object} rules
   * @returns {Object}
   */
  validateHeaders(headers, rules) {
    const errors = [];
    const normalized = {};

    for (const [key, rule] of Object.entries(rules)) {
      const headerKey = key.toLowerCase();
      const value = headers[headerKey];

      if (rule.required && (value === undefined || value === null)) {
        errors.push({ field: key, message: 'Required header missing' });
        continue;
      }

      if (value !== undefined && value !== null) {
        // Normalization
        if (rule.normalize) {
          normalized[key] = value.trim().toLowerCase();
        } else {
          normalized[key] = value;
        }

        // Pattern validation
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            errors.push({ field: key, message: 'Invalid header format' });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized
    };
  }

  /**
   * Validate body size and content type
   * @param {Object} request
   * @returns {Object}
   */
  validateBody(request) {
    const errors = [];

    // Check content type
    const contentType = request.headers?.['content-type'];
    if (contentType && !this.allowedContentTypes.some(type =>
      contentType.toLowerCase().includes(type))) {
      errors.push({ message: `Unsupported content type: ${contentType}` });
    }

    // Check body size
    if (request.body) {
      const bodySize = Buffer.isBuffer(request.body) ?
        request.body.length :
        JSON.stringify(request.body).length;

      if (bodySize > this.maxBodySize) {
        errors.push({ message: `Body too large: ${bodySize} > ${this.maxBodySize}` });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse query string
   * @private
   * @param {string} url
   * @returns {Object}
   */
  _parseQuery(url) {
    try {
      const urlObj = new URL(url);
      const query = {};
      for (const [key, value] of urlObj.searchParams) {
        query[key] = value;
      }
      return query;
    } catch (e) {
      return {};
    }
  }
}

/**
 * DDoS Protection Manager
 */
class DDoSProtection {
  constructor(options = {}) {
    this.requestHistory = new Map();
    this.spikeThreshold = options.spikeThreshold || 100; // requests per minute
    this.blockDuration = options.blockDuration || 15 * 60 * 1000; // 15 minutes
    this.blockedIPs = new Set();
    this.patternAnalysis = options.patternAnalysis !== false;
    this.challengeEnabled = options.challengeEnabled !== false;
  }

  /**
   * Analyze request for DDoS patterns
   * @param {Object} request
   * @returns {Object} - { suspicious, block, challenge }
   */
  analyze(request) {
    const ip = this._getClientIP(request);
    const now = Date.now();

    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      return { suspicious: true, block: true, challenge: false };
    }

    // Track request patterns
    if (!this.requestHistory.has(ip)) {
      this.requestHistory.set(ip, []);
    }

    const history = this.requestHistory.get(ip);
    history.push(now);

    // Clean old entries (keep last 5 minutes)
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const recentRequests = history.filter(time => time > fiveMinutesAgo);

    this.requestHistory.set(ip, recentRequests);

    // Detect spikes
    const spikeDetected = recentRequests.length > this.spikeThreshold;

    // Analyze patterns
    let patternSuspicious = false;
    if (this.patternAnalysis) {
      patternSuspicious = this._analyzePatterns(request, recentRequests);
    }

    const suspicious = spikeDetected || patternSuspicious;

    if (suspicious) {
      // Block IP
      this.blockedIPs.add(ip);
      setTimeout(() => {
        this.blockedIPs.delete(ip);
      }, this.blockDuration);

      return { suspicious: true, block: true, challenge: false };
    }

    // Issue challenge for suspicious patterns
    if (patternSuspicious && this.challengeEnabled) {
      return { suspicious: true, block: false, challenge: true };
    }

    return { suspicious: false, block: false, challenge: false };
  }

  /**
   * Generate challenge response
   * @returns {Response}
   */
  generateChallenge() {
    const challengeId = crypto.randomBytes(16).toString('hex');

    return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Security Challenge</title>
</head>
<body>
  <h1>Please verify you are human</h1>
  <form method="POST">
    <input type="hidden" name="challenge_id" value="${challengeId}">
    <button type="submit">Continue</button>
  </form>
  <script>
    // Simple JavaScript challenge
    window.challengeCompleted = false;
    setTimeout(() => { window.challengeCompleted = true; }, 2000);
  </script>
</body>
</html>`, {
      status: 403,
      headers: {
        'Content-Type': 'text/html',
        'X-Challenge-ID': challengeId
      }
    });
  }

  /**
   * Get client IP
   * @private
   * @param {Object} request
   * @returns {string}
   */
  _getClientIP(request) {
    return request.headers?.['cf-connecting-ip'] ||
           request.headers?.['x-forwarded-for']?.split(',')[0] ||
           request.headers?.['x-real-ip'] ||
           '127.0.0.1';
  }

  /**
   * Analyze request patterns
   * @private
   * @param {Object} request
   * @param {number[]} history
   * @returns {boolean}
   */
  _analyzePatterns(request, history) {
    // Check for uniform timing (bot-like)
    if (history.length >= 10) {
      const intervals = [];
      for (let i = 1; i < history.length; i++) {
        intervals.push(history[i] - history[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) =>
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

      // Low variance indicates bot-like uniform timing
      if (variance < 1000) { // Less than 1 second variance
        return true;
      }
    }

    // Check for identical user agents in short time
    // This would require additional tracking

    return false;
  }

  /**
   * Middleware for DDoS protection
   * @returns {Function}
   */
  middleware() {
    return (request, context) => {
      const analysis = this.analyze(request);

      if (analysis.block) {
        return new Response('Access denied - potential DDoS attack detected', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      if (analysis.challenge) {
        return this.generateChallenge();
      }

      return null;
    };
  }
}

module.exports = {
  SecurityHeadersManager,
  CSRFProtection,
  XSSPrevention,
  RequestValidator,
  DDoSProtection
};