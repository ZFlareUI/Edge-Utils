---
title: "Auth Manager API"
description: "Complete API reference for authentication utilities"
---

# Auth Manager API Reference

The Auth Manager provides comprehensive authentication and authorization utilities for edge environments.

## AuthManager

Main authentication management class.

### Constructor

```js
new AuthManager(options)
```

**Parameters:**
- `options` (object): Authentication configuration options

**Options:**
- `jwtSecret` (string): JWT secret key
- `jwtAlgorithm` (string): JWT algorithm
- `apiKeys` (array): Valid API keys
- `sessionTimeout` (number): Session timeout
- `providers` (array): Authentication providers

### Methods

#### authenticate(request)

Authenticate a request.

```js
const user = await auth.authenticate(request);
```

**Parameters:**
- `request` (Request): HTTP request

**Returns:** Promise resolving to user object or null

#### generateToken(payload, options)

Generate JWT token.

```js
const token = await auth.generateToken({ userId: '123', role: 'user' });
```

**Parameters:**
- `payload` (object): Token payload
- `options` (object, optional): Token options

**Returns:** Promise resolving to JWT token

#### verifyToken(token)

Verify JWT token.

```js
const payload = await auth.verifyToken(token);
```

**Parameters:**
- `token` (string): JWT token

**Returns:** Promise resolving to token payload

#### validateApiKey(key)

Validate API key.

```js
const isValid = await auth.validateApiKey('api-key-123');
```

**Parameters:**
- `key` (string): API key

**Returns:** Promise resolving to boolean

#### createSession(user, options)

Create user session.

```js
const session = await auth.createSession(user, { ttl: 3600000 });
```

**Parameters:**
- `user` (object): User object
- `options` (object, optional): Session options

**Returns:** Promise resolving to session object

#### validateSession(sessionId)

Validate user session.

```js
const session = await auth.validateSession('session-123');
```

**Parameters:**
- `sessionId` (string): Session ID

**Returns:** Promise resolving to session object or null

## Type Definitions

### AuthOptions

```typescript
interface AuthOptions {
  jwtSecret?: string;
  jwtAlgorithm?: string;
  apiKeys?: string[];
  sessionTimeout?: number;
  providers?: AuthProvider[];
}
```

### User

```typescript
interface User {
  id: string;
  email?: string;
  role?: string;
  permissions?: string[];
}
```

### Session

```typescript
interface Session {
  id: string;
  userId: string;
  expiresAt: number;
  data?: any;
}
```