/**
 * Authentication Tests
 * @jest-environment node
 */

const {
  JWTManager,
  APIKeyManager,
  EdgeSessionManager
} = require('../src/auth');

describe('JWTManager', () => {
  let jwtManager;

  beforeEach(() => {
    jwtManager = new JWTManager({
      secret: 'test-secret-key',
      algorithm: 'HS256',
      expiresIn: '1h'
    });
  });

  test('generates JWT token', async () => {
    const payload = { userId: '123', role: 'admin' };
    const token = await jwtManager.generate(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  test('verifies valid JWT token', async () => {
    const payload = { userId: '123', role: 'admin' };
    const token = jwtManager.generate(payload);

    const decoded = jwtManager.verify(token);
    expect(decoded.valid).toBe(true);
    expect(decoded.payload.userId).toBe('123');
    expect(decoded.payload.role).toBe('admin');
  });

  test('rejects invalid JWT token', async () => {
    const result = jwtManager.verify('invalid-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('refreshes JWT token', async () => {
    const payload = { userId: '123', role: 'admin' };
    const refreshToken = jwtManager.generateRefreshToken(payload);

    const refreshResult = jwtManager.refresh(refreshToken);
    expect(refreshResult.valid).toBe(true);
    expect(typeof refreshResult.accessToken).toBe('string');

    const decoded = jwtManager.verify(refreshResult.accessToken);
    expect(decoded.valid).toBe(true);
    expect(decoded.payload.userId).toBe('123');
  });
});

describe('APIKeyManager', () => {
  let apiKeyManager;

  beforeEach(() => {
    apiKeyManager = new APIKeyManager({
      secret: 'test-secret',
      headerName: 'X-API-Key'
    });
  });

  test('generates API key', () => {
    const key = apiKeyManager.generate();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  test('validates correct API key', () => {
    const key = apiKeyManager.generate();
    const result = apiKeyManager.validate(key);
    expect(result.valid).toBe(true);
  });

  test('rejects invalid API key', () => {
    const result = apiKeyManager.validate('invalid-key');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('EdgeSessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    sessionManager = new EdgeSessionManager({
      secret: 'test-secret',
      cookieName: 'session-id',
      maxAge: 3600000 // 1 hour
    });
  });

  test('creates new session', async () => {
    const sessionData = { userId: '123', role: 'admin' };
    const sessionId = await sessionManager.create(sessionData);

    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
  });

  test('retrieves session data', async () => {
    const sessionData = { userId: '123', role: 'admin' };
    const sessionId = await sessionManager.create(sessionData);

    const retrieved = await sessionManager.get(sessionId);
    expect(retrieved.userId).toBe('123');
    expect(retrieved.role).toBe('admin');
  });

  test('returns null for invalid session', async () => {
    const session = await sessionManager.get('invalid-session-id');
    expect(session).toBe(null);
  });

  test('updates session data', async () => {
    const sessionData = { userId: '123', role: 'admin' };
    const sessionId = await sessionManager.create(sessionData);

    await sessionManager.update(sessionId, { role: 'user' });

    const updated = await sessionManager.get(sessionId);
    expect(updated.role).toBe('user');
    expect(updated.userId).toBe('123'); // Unchanged
  });

  test('destroys session', async () => {
    const sessionData = { userId: '123' };
    const sessionId = await sessionManager.create(sessionData);

    await sessionManager.destroy(sessionId);

    const session = await sessionManager.get(sessionId);
    expect(session).toBe(null);
  });

  test('handles session expiration', async () => {
    // Create session manager with very short ttl
    const shortSessionManager = new EdgeSessionManager({
      secret: 'test-secret',
      ttl: 1 // 1ms
    });

    const sessionData = { userId: '123' };
    const sessionId = await shortSessionManager.create(sessionData);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));

    const session = await shortSessionManager.get(sessionId);
    expect(session).toBe(null);
  });
});