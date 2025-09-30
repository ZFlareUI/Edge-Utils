/**
 * Authentication & Authorization Module for Edge Computing
 * @module edge-utils/auth
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT Manager
 * Handles JWT token creation, validation, and management
 */
class JWTManager {
  constructor(options = {}) {
    this.secret = options.secret || crypto.randomBytes(32).toString('hex');
    this.algorithm = options.algorithm || 'HS256';
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.expiration = options.expiration || '1h';
    this.clockTolerance = options.clockTolerance || 30; // seconds
    this.refreshExpiration = options.refreshExpiration || '7d';
    this.revocationStore = options.revocationStore || new Set();
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {Object} options - Additional options
   * @returns {string}
   */
  generate(payload, options = {}) {
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this._parseExpiration(options.expiration || this.expiration)
    };

    if (this.issuer) tokenPayload.iss = this.issuer;
    if (this.audience) tokenPayload.aud = this.audience;

    return jwt.sign(tokenPayload, this.secret, {
      algorithm: options.algorithm || this.algorithm
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload
   * @returns {string}
   */
  generateRefreshToken(payload) {
    const refreshPayload = {
      ...payload,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this._parseExpiration(this.refreshExpiration)
    };

    return jwt.sign(refreshPayload, this.secret, {
      algorithm: this.algorithm
    });
  }

  /**
   * Verify JWT token
   * @param {string} token
   * @param {Object} options
   * @returns {Object} - { valid, payload, error }
   */
  verify(token, options = {}) {
    try {
      // Check revocation
      if (this.revocationStore.has(token)) {
        return { valid: false, error: 'Token revoked' };
      }

      const payload = jwt.verify(token, this.secret, {
        algorithms: [options.algorithm || this.algorithm],
        issuer: options.issuer || this.issuer,
        audience: options.audience || this.audience,
        clockTolerance: options.clockTolerance || this.clockTolerance,
        ignoreExpiration: options.ignoreExpiration || false
      });

      // Custom claim validation
      if (options.customValidator && !options.customValidator(payload)) {
        return { valid: false, error: 'Custom validation failed' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Object} - { valid, accessToken, error }
   */
  refresh(refreshToken) {
    const refreshResult = this.verify(refreshToken);

    if (!refreshResult.valid) {
      return { valid: false, error: refreshResult.error };
    }

    if (refreshResult.payload.type !== 'refresh') {
      return { valid: false, error: 'Invalid refresh token' };
    }

    // Generate new access token
    const { type, iat, exp, ...userPayload } = refreshResult.payload;
    const accessToken = this.generate(userPayload);

    return { valid: true, accessToken };
  }

  /**
   * Revoke token
   * @param {string} token
   */
  revoke(token) {
    this.revocationStore.add(token);
  }

  /**
   * Check if token is revoked
   * @param {string} token
   * @returns {boolean}
   */
  isRevoked(token) {
    return this.revocationStore.has(token);
  }

  /**
   * Decode token without verification
   * @param {string} token
   * @returns {Object|null}
   */
  decode(token) {
    try {
      return jwt.decode(token);
    } catch (e) {
      return null;
    }
  }

  /**
   * Multi-tenant token validation
   * @param {string} token
   * @param {string} tenantId
   * @returns {Object}
   */
  validateForTenant(token, tenantId) {
    const result = this.verify(token);

    if (!result.valid) {
      return result;
    }

    if (result.payload.tenant !== tenantId) {
      return { valid: false, error: 'Invalid tenant' };
    }

    return result;
  }

  /**
   * Parse expiration time
   * @private
   * @param {string|number} exp
   * @returns {number}
   */
  _parseExpiration(exp) {
    if (typeof exp === 'number') return exp;

    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1h

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}

/**
 * API Key Manager
 * Handles API key validation, rotation, and management
 */
class APIKeyManager {
  constructor(options = {}) {
    this.keys = new Map(); // key -> metadata
    this.usage = new Map(); // key -> usage data
    this.storage = options.storage;
    this.hmacSecret = options.hmacSecret || crypto.randomBytes(32).toString('hex');
    this.rotationWindow = options.rotationWindow || 30 * 24 * 60 * 60 * 1000; // 30 days
    this.auditLog = options.auditLog || [];
  }

  /**
   * Generate new API key
   * @param {Object} metadata
   * @returns {string}
   */
  generate(metadata = {}) {
    const keyId = crypto.randomBytes(8).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    const combined = `${keyId}:${secret}`;

    // Create HMAC signature
    const signature = crypto.createHmac('sha256', this.hmacSecret)
      .update(combined)
      .digest('hex');

    const apiKey = `ak_${keyId}_${signature}`;

    // Store metadata
    this.keys.set(apiKey, {
      ...metadata,
      secret,
      created: Date.now(),
      lastUsed: null,
      usage: 0,
      permissions: metadata.permissions || [],
      expires: metadata.expires || null,
      quota: metadata.quota || null
    });

    return apiKey;
  }

  /**
   * Validate API key
   * @param {string} apiKey
   * @returns {Object} - { valid, metadata, error }
   */
  validate(apiKey) {
    const metadata = this.keys.get(apiKey);

    if (!metadata) {
      this._logAudit('invalid_key', { apiKey: apiKey.substring(0, 10) + '...' });
      return { valid: false, error: 'Invalid API key' };
    }

    // Check expiration
    if (metadata.expires && Date.now() > metadata.expires) {
      this._logAudit('expired_key', { keyId: apiKey.split('_')[1] });
      return { valid: false, error: 'API key expired' };
    }

    // Check quota
    if (metadata.quota && metadata.usage >= metadata.quota.limit) {
      this._logAudit('quota_exceeded', { keyId: apiKey.split('_')[1] });
      return { valid: false, error: 'API key quota exceeded' };
    }

    // Verify signature
    const parts = apiKey.split('_');
    if (parts.length !== 3 || parts[0] !== 'ak') {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyId = parts[1];
    const providedSignature = parts[2];
    const secret = this._getSecretForKeyId(keyId);

    if (!secret) {
      return { valid: false, error: 'Key not found' };
    }

    const combined = `${keyId}:${secret}`;
    const expectedSignature = crypto.createHmac('sha256', this.hmacSecret)
      .update(combined)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      this._logAudit('invalid_signature', { keyId });
      return { valid: false, error: 'Invalid API key signature' };
    }

    // Update usage
    metadata.usage++;
    metadata.lastUsed = Date.now();
    this.keys.set(apiKey, metadata);

    this._logAudit('valid_key', { keyId, usage: metadata.usage });

    return { valid: true, metadata };
  }

  /**
   * Rotate API key
   * @param {string} oldKey
   * @returns {string|null}
   */
  rotate(oldKey) {
    const metadata = this.keys.get(oldKey);
    if (!metadata) return null;

    // Generate new key with same metadata
    const newKey = this.generate(metadata);

    // Keep old key valid for rotation window
    metadata.rotateTo = newKey;
    metadata.rotateExpires = Date.now() + this.rotationWindow;
    this.keys.set(oldKey, metadata);

    return newKey;
  }

  /**
   * Revoke API key
   * @param {string} apiKey
   */
  revoke(apiKey) {
    this.keys.delete(apiKey);
    this._logAudit('key_revoked', { keyId: apiKey.split('_')[1] });
  }

  /**
   * Update key permissions
   * @param {string} apiKey
   * @param {string[]} permissions
   */
  updatePermissions(apiKey, permissions) {
    const metadata = this.keys.get(apiKey);
    if (metadata) {
      metadata.permissions = permissions;
      this.keys.set(apiKey, metadata);
    }
  }

  /**
   * Get usage statistics
   * @param {string} apiKey
   * @returns {Object|null}
   */
  getUsage(apiKey) {
    const metadata = this.keys.get(apiKey);
    return metadata ? {
      usage: metadata.usage,
      lastUsed: metadata.lastUsed,
      quota: metadata.quota
    } : null;
  }

  /**
   * List all keys (admin function)
   * @returns {Array}
   */
  listKeys() {
    const keys = [];
    for (const [key, metadata] of this.keys) {
      keys.push({
        key: key.substring(0, 15) + '...', // Partial key for security
        created: metadata.created,
        lastUsed: metadata.lastUsed,
        usage: metadata.usage,
        permissions: metadata.permissions
      });
    }
    return keys;
  }

  /**
   * Get audit log
   * @returns {Array}
   */
  getAuditLog() {
    return [...this.auditLog];
  }

  /**
   * Get secret for key ID (internal)
   * @private
   * @param {string} keyId
   * @returns {string|null}
   */
  _getSecretForKeyId(keyId) {
    for (const [key, metadata] of this.keys) {
      if (key.includes(keyId)) {
        return metadata.secret;
      }
    }
    return null;
  }

  /**
   * Log audit event
   * @private
   * @param {string} event
   * @param {Object} data
   */
  _logAudit(event, data) {
    this.auditLog.push({
      timestamp: Date.now(),
      event,
      ...data
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }
}

/**
 * Edge Session Manager
 * Handles encrypted sessions with distributed storage
 */
class EdgeSessionManager {
  constructor(options = {}) {
    this.secret = options.secret || crypto.randomBytes(32).toString('hex');
    this.storage = options.storage || new Map();
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours
    this.slidingExpiration = options.slidingExpiration !== false;
    this.compression = options.compression !== false;
    this.maxConcurrentSessions = options.maxConcurrentSessions || 5;
    this.cookieOptions = {
      name: options.cookieName || 'session',
      httpOnly: options.httpOnly !== false,
      secure: options.secure !== false,
      sameSite: options.sameSite || 'strict',
      path: options.path || '/',
      ...options.cookieOptions
    };
  }

  /**
   * Create new session
   * @param {Object} data - Session data
   * @param {string} userId
   * @returns {string} - Session ID
   */
  async create(data, userId) {
    // Check concurrent session limit
    if (userId) {
      const userSessions = await this._getUserSessions(userId);
      if (userSessions.length >= this.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSession = userSessions.sort((a, b) => a.created - b.created)[0];
        await this.destroy(oldestSession.id);
      }
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    const session = {
      id: sessionId,
      userId,
      data: this.compression ? this._compress(data) : data,
      created: Date.now(),
      lastAccessed: Date.now(),
      expires: Date.now() + this.ttl
    };

    await this._store(session);
    return sessionId;
  }

  /**
   * Get session data
   * @param {string} sessionId
   * @returns {Object|null}
   */
  async get(sessionId) {
    const session = await this._retrieve(sessionId);
    if (!session) return null;

    // Check expiration
    if (Date.now() > session.expires) {
      await this.destroy(sessionId);
      return null;
    }

    // Update last accessed for sliding expiration
    if (this.slidingExpiration) {
      session.lastAccessed = Date.now();
      session.expires = Date.now() + this.ttl;
      await this._store(session);
    }

    return this.compression ? this._decompress(session.data) : session.data;
  }

  /**
   * Update session data
   * @param {string} sessionId
   * @param {Object} data
   */
  async update(sessionId, data) {
    const session = await this._retrieve(sessionId);
    if (!session) return;

    // Get existing data and merge with new data
    const existingData = this.compression ? this._decompress(session.data) : session.data;
    const mergedData = { ...existingData, ...data };

    session.data = this.compression ? this._compress(mergedData) : mergedData;
    session.lastAccessed = Date.now();

    await this._store(session);
  }

  /**
   * Destroy session
   * @param {string} sessionId
   */
  async destroy(sessionId) {
    await this._remove(sessionId);
  }

  /**
   * Destroy all sessions for user
   * @param {string} userId
   */
  async destroyUserSessions(userId) {
    const userSessions = await this._getUserSessions(userId);
    for (const session of userSessions) {
      await this.destroy(session.id);
    }
  }

  /**
   * Generate session token (encrypted)
   * @param {string} sessionId
   * @returns {string}
   */
  generateToken(sessionId) {
    const payload = `${sessionId}:${Date.now()}`;
    const cipher = crypto.createCipher('aes-256-cbc', this.secret);
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Verify session token
   * @param {string} token
   * @returns {string|null} - Session ID
   */
  verifyToken(token) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.secret);
      let decrypted = decipher.update(token, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const [sessionId, timestamp] = decrypted.split(':');

      // Check token age (5 minutes)
      if (Date.now() - parseInt(timestamp) > 300000) {
        return null;
      }

      return sessionId;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get session cookie options
   * @param {string} value
   * @returns {Object}
   */
  getCookieOptions(value) {
    return {
      ...this.cookieOptions,
      value,
      maxAge: Math.floor(this.ttl / 1000)
    };
  }

  /**
   * Middleware for session management
   * @returns {Function}
   */
  middleware() {
    return async (request, context) => {
      // Extract session token from cookie or header
      const sessionToken = this._extractSessionToken(request);
      if (!sessionToken) return null;

      const sessionId = this.verifyToken(sessionToken);
      if (!sessionId) return null;

      const sessionData = await this.get(sessionId);
      if (!sessionData) return null;

      context.session = { id: sessionId, data: sessionData };
      return null;
    };
  }

  /**
   * Extract session token from request
   * @private
   * @param {Object} request
   * @returns {string|null}
   */
  _extractSessionToken(request) {
    // Try cookie first
    const cookies = this._parseCookies(request.headers?.cookie || '');
    if (cookies[this.cookieOptions.name]) {
      return cookies[this.cookieOptions.name];
    }

    // Try authorization header
    const auth = request.headers?.authorization;
    if (auth && auth.startsWith('Session ')) {
      return auth.substring(8);
    }

    return null;
  }

  /**
   * Parse cookies string
   * @private
   * @param {string} cookieString
   * @returns {Object}
   */
  _parseCookies(cookieString) {
    const cookies = {};
    if (!cookieString) return cookies;

    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });

    return cookies;
  }

  /**
   * Store session
   * @private
   * @param {Object} session
   */
  async _store(session) {
    const key = `session:${session.id}`;
    try {
      const value = JSON.stringify(session);
      await this.storage.put?.(key, value) || this.storage.set(key, value);
    } catch (e) {
      // Storage unavailable
    }
  }

  /**
   * Retrieve session
   * @private
   * @param {string} sessionId
   * @returns {Object|null}
   */
  async _retrieve(sessionId) {
    const key = `session:${sessionId}`;
    try {
      const value = await this.storage.get?.(key) || this.storage.get(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Remove session
   * @private
   * @param {string} sessionId
   */
  async _remove(sessionId) {
    const key = `session:${sessionId}`;
    try {
      await this.storage.delete?.(key) || this.storage.delete(key);
    } catch (e) {
      // Storage unavailable
    }
  }

  /**
   * Get all sessions for user
   * @private
   * @param {string} userId
   * @returns {Array}
   */
  async _getUserSessions(userId) {
    // This is a simplified implementation
    // In a real system, you'd need to maintain a user -> sessions index
    const sessions = [];
    try {
      // This would require iterating through all sessions, which is inefficient
      // A better implementation would maintain separate user session indices
      return sessions;
    } catch (e) {
      return [];
    }
  }

  /**
   * Compress session data
   * @private
   * @param {Object} data
   * @returns {string}
   */
  _compress(data) {
    // Simple compression - in real implementation, use proper compression
    return JSON.stringify(data);
  }

  /**
   * Decompress session data
   * @private
   * @param {string} compressed
   * @returns {Object}
   */
  _decompress(compressed) {
    return JSON.parse(compressed);
  }
}

module.exports = {
  JWTManager,
  APIKeyManager,
  EdgeSessionManager
};