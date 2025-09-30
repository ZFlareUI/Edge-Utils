# Authentication & Authorization

The authentication utilities provide comprehensive authentication and authorization capabilities specifically designed for edge environments, supporting JWT tokens, API keys, session management, and OAuth flows.

## Features

- JWT Management: Secure JWT token generation, verification, and refresh
- API Key Management: HMAC-based API key generation and validation
- Session Management: Distributed session handling with automatic cleanup
- OAuth Support: OAuth 2.0 client and server implementations
- Security Features: Token blacklisting, rotation, and secure storage
- Edge Optimized: Designed for low-latency edge environments
- Audit Logging: Comprehensive authentication event logging

## Quick Start

```js
const { JWTManager, APIKeyManager, EdgeSessionManager } = require('edge-utils/auth');

// JWT Authentication
const jwt = new JWTManager({
  secret: 'your-secret-key',
  issuer: 'your-app',
  audience: 'your-users'
});

const token = jwt.generate({ userId: 123, role: 'admin' });
const verified = jwt.verify(token);

// API Key Management
const apiKeys = new APIKeyManager({
  hmacSecret: 'key-secret',
  storage: kvStorage
});

const key = apiKeys.generate({
  permissions: ['read', 'write'],
  quota: { limit: 1000, period: 'hour' }
});

// Session Management
const sessions = new EdgeSessionManager({
  secret: 'session-secret',
  storage: kvStorage,
  ttl: 24 * 60 * 60 * 1000
});

const sessionId = await sessions.create({ userId: 123 }, 'user-123');
```

## JWTManager

Secure JWT token management with automatic refresh and blacklisting capabilities.

### Constructor Options

```js
const jwt = new JWTManager({
  secret: 'your-secret-key',           // HMAC secret or RSA private key
  publicKey: 'public-key',             // RSA public key (for verification only)
  issuer: 'your-app',                  // Token issuer
  audience: 'your-users',              // Token audience
  expiresIn: '1h',                     // Token expiration time
  algorithm: 'HS256',                  // Signing algorithm
  blacklistedTokens: new Set(),        // Token blacklist
  storage: kvStorage                   // Optional distributed storage
});
```

### Token Generation

```js
// Generate access token
const accessToken = jwt.generate({
  userId: 123,
  email: 'user@example.com',
  role: 'admin',
  permissions: ['read', 'write', 'delete']
});

// Generate refresh token
const refreshToken = jwt.generate({
  userId: 123,
  type: 'refresh'
}, { expiresIn: '7d' });

// Generate custom claims
const customToken = jwt.generate({
  sub: 'user-123',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  customClaim: 'value'
});
```

### Token Verification

```js
// Verify token
const result = jwt.verify(token);

if (result.valid) {
  console.log('Token payload:', result.payload);
  console.log('Token issued at:', new Date(result.payload.iat * 1000));
  console.log('Token expires at:', new Date(result.payload.exp * 1000));
} else {
  console.log('Token invalid:', result.error);
}

// Verify with custom options
const customResult = jwt.verify(token, {
  issuer: 'expected-issuer',
  audience: 'expected-audience',
  ignoreExpiration: false
});
```

### Token Refresh

```js
// Refresh access token using refresh token
const newTokens = await jwt.refresh(refreshToken);

if (newTokens) {
  console.log('New access token:', newTokens.accessToken);
  console.log('New refresh token:', newTokens.refreshToken);
} else {
  console.log('Refresh failed - token may be expired or invalid');
}
```

### Token Blacklisting

```js
// Blacklist a token (e.g., on logout)
await jwt.blacklist(token);

// Check if token is blacklisted
const isBlacklisted = await jwt.isBlacklisted(token);

// Clear expired blacklisted tokens
await jwt.cleanupBlacklist();
```

## APIKeyManager

HMAC-based API key generation and validation with quota management.

### Constructor Options

```js
const apiKeys = new APIKeyManager({
  hmacSecret: 'your-hmac-secret',      // Secret for HMAC signing
  keyLength: 32,                       // API key length in bytes
  storage: kvStorage,                   // Optional distributed storage
  quotaStorage: kvStorage,              // Storage for quota tracking
  defaultQuota: {                       // Default quota settings
    limit: 1000,
    period: 'hour'
  }
});
```

### API Key Generation

```js
// Generate API key with permissions
const apiKey = apiKeys.generate({
  name: 'My API Key',
  permissions: ['read', 'write'],
  quota: {
    limit: 5000,
    period: 'day'
  },
  metadata: {
    createdBy: 'user-123',
    environment: 'production'
  }
});

console.log('API Key:', apiKey.key);
console.log('Key ID:', apiKey.id);
```

### API Key Validation

```js
// Validate API key
const validation = await apiKeys.validate(apiKey, 'read');

if (validation.valid) {
  console.log('Key is valid for operation');
  console.log('Permissions:', validation.permissions);
  console.log('Quota remaining:', validation.quotaRemaining);
} else {
  console.log('Key invalid:', validation.error);
}

// Check quota without validation
const quota = await apiKeys.checkQuota(apiKey);
console.log('Requests used:', quota.used);
console.log('Limit:', quota.limit);
console.log('Reset time:', new Date(quota.resetTime));
```

### API Key Management

```js
// List API keys for a user
const keys = await apiKeys.list('user-123');

// Update API key permissions
await apiKeys.update(apiKey.id, {
  permissions: ['read', 'write', 'delete'],
  quota: { limit: 10000, period: 'day' }
});

// Revoke API key
await apiKeys.revoke(apiKey.id);

// Rotate API key (generate new key, keep same permissions)
const newKey = await apiKeys.rotate(apiKey.id);
```

## EdgeSessionManager

Distributed session management with automatic cleanup and security features.

### Constructor Options

```js
const sessions = new EdgeSessionManager({
  secret: 'session-secret',             // Secret for session signing
  storage: kvStorage,                   // Distributed storage (KV, Redis, etc.)
  ttl: 30 * 60 * 1000,                  // Session TTL in milliseconds (30 minutes)
  secure: true,                         // Require HTTPS
  httpOnly: true,                       // HTTP-only cookies
  sameSite: 'strict',                   // CSRF protection
  domain: '.example.com',               // Cookie domain
  path: '/',                            // Cookie path
  cleanupInterval: 60 * 60 * 1000       // Cleanup interval (1 hour)
});
```

### Session Creation

```js
// Create session with data
const sessionId = await sessions.create({
  userId: 123,
  email: 'user@example.com',
  role: 'admin',
  lastLogin: new Date().toISOString()
}, 'user-123');

console.log('Session ID:', sessionId);
```

### Session Retrieval

```js
// Get session data
const sessionData = await sessions.get(sessionId);

if (sessionData) {
  console.log('User ID:', sessionData.userId);
  console.log('Session expires:', new Date(sessionData.expires));
} else {
  console.log('Session not found or expired');
}

// Get session from request (extracts from cookies)
const requestSession = await sessions.getFromRequest(request);
```

### Session Updates

```js
// Update session data
await sessions.update(sessionId, {
  lastActivity: new Date().toISOString(),
  pageViews: 42
});

// Extend session TTL
await sessions.extend(sessionId, 60 * 60 * 1000); // Extend by 1 hour

// Touch session (update last access time)
await sessions.touch(sessionId);
```

### Session Destruction

```js
// Destroy specific session
await sessions.destroy(sessionId);

// Destroy all sessions for a user
await sessions.destroyUserSessions('user-123');

// Destroy all sessions (admin operation)
await sessions.destroyAll();
```

### Session Cookies

```js
// Set session cookie in response
const response = new Response('Success');
await sessions.setCookie(response, sessionId);

// Clear session cookie
const logoutResponse = new Response('Logged out');
await sessions.clearCookie(logoutResponse);
```

## OAuthManager

OAuth 2.0 client and server implementations for edge environments.

### OAuth Client

```js
const { OAuthClient } = require('edge-utils/auth');

const oauth = new OAuthClient({
  provider: 'google',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://yourapp.com/oauth/callback',
  scopes: ['openid', 'profile', 'email']
});

// Generate authorization URL
const authUrl = oauth.getAuthorizationUrl({
  state: 'random-state',
  nonce: 'random-nonce'
});

// Exchange code for tokens
const tokens = await oauth.exchangeCode(code, {
  state: 'expected-state'
});

console.log('Access token:', tokens.accessToken);
console.log('Refresh token:', tokens.refreshToken);
console.log('ID token:', tokens.idToken);
```

### OAuth Server

```js
const { OAuthServer } = require('edge-utils/auth');

const oauthServer = new OAuthServer({
  issuer: 'https://yourapp.com',
  clients: {
    'client-id': {
      secret: 'client-secret',
      redirectUris: ['https://clientapp.com/callback'],
      grants: ['authorization_code', 'refresh_token']
    }
  },
  storage: kvStorage
});

// Handle authorization request
const authResponse = await oauthServer.handleAuthorization(request);

// Handle token request
const tokenResponse = await oauthServer.handleToken(request);
```

## Security Features

### Token Rotation

```js
// Automatic token rotation
const jwt = new JWTManager({
  secret: 'current-secret',
  rotationEnabled: true,
  oldSecrets: ['previous-secret-1', 'previous-secret-2']
});

// Tokens signed with old secrets are still valid during rotation period
const oldToken = 'token-signed-with-old-secret';
const result = jwt.verify(oldToken); // Still valid
```

### Audit Logging

```js
const jwt = new JWTManager({
  secret: 'secret',
  auditLog: true,
  auditStorage: kvStorage
});

// All authentication events are logged
const token = jwt.generate({ userId: 123 });
const result = jwt.verify(token);

// Retrieve audit logs
const logs = await jwt.getAuditLogs({
  userId: 123,
  event: 'token_generated',
  since: new Date(Date.now() - 24 * 60 * 60 * 1000)
});
```

## Middleware Integration

### Authentication Middleware

```js
const { JWTManager, APIKeyManager } = require('edge-utils/auth');

const jwt = new JWTManager({ secret: process.env.JWT_SECRET });
const apiKeys = new APIKeyManager({ hmacSecret: process.env.API_KEY_SECRET });

const authMiddleware = async (request, context) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return new Response('Authentication required', { status: 401 });
  }

  // JWT Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = jwt.verify(token);

    if (!result.valid) {
      return new Response('Invalid token', { status: 401 });
    }

    context.user = result.payload;
    return null;
  }

  // API Key
  if (authHeader.startsWith('ApiKey ')) {
    const key = authHeader.substring(7);
    const validation = await apiKeys.validate(key, context.operation);

    if (!validation.valid) {
      return new Response('Invalid API key', { status: 401 });
    }

    context.apiKey = validation.keyData;
    return null;
  }

  return new Response('Invalid authentication method', { status: 401 });
};
```

### Session Middleware

```js
const { EdgeSessionManager } = require('edge-utils/auth');

const sessions = new EdgeSessionManager({
  secret: process.env.SESSION_SECRET,
  storage: kvStorage
});

const sessionMiddleware = async (request, context) => {
  // Get session from request
  const sessionData = await sessions.getFromRequest(request);

  if (sessionData) {
    context.session = sessionData;
    context.user = { id: sessionData.userId };

    // Update session activity
    await sessions.touch(sessionData.id);
  }

  // Continue to next middleware
  const response = await context.next();

  // Set session cookie if session exists
  if (context.session) {
    await sessions.setCookie(response, context.session.id);
  }

  return response;
};
```

## Advanced Examples

### Complete Authentication Flow

```js
const {
  JWTManager,
  APIKeyManager,
  EdgeSessionManager,
  OAuthClient
} = require('edge-utils/auth');

// Initialize managers
const jwt = new JWTManager({
  secret: process.env.JWT_SECRET,
  issuer: 'my-app',
  audience: 'users'
});

const apiKeys = new APIKeyManager({
  hmacSecret: process.env.API_KEY_SECRET,
  storage: kvStorage
});

const sessions = new EdgeSessionManager({
  secret: process.env.SESSION_SECRET,
  storage: kvStorage
});

const oauth = new OAuthClient({
  provider: 'google',
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/oauth/callback`
});

// Authentication endpoints
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Login with credentials
    if (url.pathname === '/auth/login' && request.method === 'POST') {
      const { email, password } = await request.json();

      // Validate credentials (implement your own logic)
      const user = await validateCredentials(email, password);

      if (!user) {
        return new Response('Invalid credentials', { status: 401 });
      }

      // Create session
      const sessionId = await sessions.create({
        userId: user.id,
        email: user.email,
        role: user.role
      }, user.id);

      // Generate tokens
      const accessToken = jwt.generate({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = jwt.generate({
        userId: user.id,
        type: 'refresh'
      }, { expiresIn: '7d' });

      const response = new Response(JSON.stringify({
        accessToken,
        refreshToken,
        sessionId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

      // Set session cookie
      await sessions.setCookie(response, sessionId);

      return response;
    }

    // OAuth login
    if (url.pathname === '/auth/oauth/login') {
      const authUrl = oauth.getAuthorizationUrl({
        state: generateState(),
        scope: ['openid', 'profile', 'email']
      });

      return new Response(null, {
        status: 302,
        headers: { Location: authUrl }
      });
    }

    // OAuth callback
    if (url.pathname === '/auth/oauth/callback') {
      const { code, state } = Object.fromEntries(url.searchParams);

      // Verify state
      if (!verifyState(state)) {
        return new Response('Invalid state', { status: 400 });
      }

      // Exchange code for tokens
      const tokens = await oauth.exchangeCode(code);

      // Get user info from ID token
      const userInfo = jwt.decode(tokens.idToken);

      // Create session and tokens
      const sessionId = await sessions.create({
        userId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name
      }, userInfo.sub);

      const accessToken = jwt.generate({
        userId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name
      });

      const response = new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' }
      });

      await sessions.setCookie(response, sessionId);

      return response;
    }

    // Refresh token
    if (url.pathname === '/auth/refresh' && request.method === 'POST') {
      const { refreshToken } = await request.json();

      const newTokens = await jwt.refresh(refreshToken);

      if (!newTokens) {
        return new Response('Invalid refresh token', { status: 401 });
      }

      return new Response(JSON.stringify(newTokens), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Logout
    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      const sessionData = await sessions.getFromRequest(request);

      if (sessionData) {
        await sessions.destroy(sessionData.id);
      }

      const response = new Response('Logged out');
      await sessions.clearCookie(response);

      return response;
    }

    // API key generation
    if (url.pathname === '/auth/api-keys' && request.method === 'POST') {
      const sessionData = await sessions.getFromRequest(request);

      if (!sessionData) {
        return new Response('Authentication required', { status: 401 });
      }

      const { name, permissions } = await request.json();

      const apiKey = apiKeys.generate({
        name,
        permissions,
        metadata: { createdBy: sessionData.userId }
      });

      return new Response(JSON.stringify(apiKey), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
```

## Performance Considerations

### JWT Performance
- Use HS256 for best performance in edge environments
- Keep payload size minimal
- Cache verification results when possible
- Use short expiration times for sensitive operations

### Session Performance
- Use distributed storage (KV, Redis) for multi-region deployments
- Implement session cleanup to prevent storage bloat
- Use appropriate TTL values based on application needs
- Consider session compression for large session data

### API Key Performance
- Cache validation results with short TTL
- Use efficient storage backends
- Implement quota checking with minimal database calls
- Consider rate limiting for API key validation endpoints

## Platform-Specific Notes

### Cloudflare Workers
- Compatible with Cloudflare KV for distributed storage
- Supports Durable Objects for advanced session management
- Use Web Crypto API for cryptographic operations

### Vercel Edge Functions
- Compatible with Edge Config for storage
- Supports environment variables for secrets
- Use Vercel KV for distributed sessions

### Deno Deploy
- Native performance with Deno runtime
- Compatible with Deno KV for storage
- Supports all modern cryptographic APIs

## Security Best Practices

### Token Security
- Use strong, randomly generated secrets
- Implement token rotation policies
- Set appropriate expiration times
- Use HTTPS for all authentication endpoints

### Session Security
- Use secure, httpOnly cookies
- Implement CSRF protection
- Set appropriate session timeouts
- Clean up expired sessions regularly

### API Key Security
- Use HMAC for key validation
- Implement key rotation policies
- Set reasonable quota limits
- Monitor key usage patterns

## Testing

Run authentication tests with:

```bash
npm test -- --testPathPattern=auth.test.js
```

## API Reference

### JWTManager Methods
- `generate(payload, options)` - Generate JWT token
- `verify(token, options)` - Verify JWT token
- `decode(token)` - Decode token without verification
- `refresh(refreshToken)` - Refresh access token
- `blacklist(token)` - Blacklist token
- `isBlacklisted(token)` - Check if token is blacklisted

### APIKeyManager Methods
- `generate(options)` - Generate API key
- `validate(key, permission)` - Validate API key
- `checkQuota(key)` - Check API key quota
- `list(userId)` - List API keys for user
- `update(keyId, updates)` - Update API key
- `revoke(keyId)` - Revoke API key
- `rotate(keyId)` - Rotate API key

### EdgeSessionManager Methods
- `create(data, userId)` - Create session
- `get(sessionId)` - Get session data
- `getFromRequest(request)` - Get session from request
- `update(sessionId, data)` - Update session
- `extend(sessionId, ttl)` - Extend session TTL
- `touch(sessionId)` - Update last access time
- `destroy(sessionId)` - Destroy session
- `destroyUserSessions(userId)` - Destroy all user sessions
- `setCookie(response, sessionId)` - Set session cookie
- `clearCookie(response)` - Clear session cookie

## Contributing

When contributing to authentication utilities:

1. Maintain security best practices
2. Add comprehensive tests for security features
3. Update documentation for API changes
4. Follow OWASP security guidelines
5. Test across all supported platforms

## License

MIT</content>
<parameter name="filePath">/Users/pratikacharya/Desktop/package/edge-utils/docs/auth.md