---
title: "Security Utils API"
description: "Complete API reference for security utilities"
---

# Security Utils API Reference

The Security Utils provide comprehensive security features including headers, CSRF protection, XSS prevention, and DDoS mitigation.

## SecurityHeaders

HTTP security headers management.

### Constructor

```js
new SecurityHeaders(options)
```

**Parameters:**
- `options` (object): Security headers configuration

### Methods

#### applyHeaders(response)

Apply security headers to response.

```js
const secureResponse = securityHeaders.applyHeaders(response);
```

**Parameters:**
- `response` (Response): HTTP response

**Returns:** Response with security headers

#### setHeader(name, value)

Set custom security header.

```js
securityHeaders.setHeader('X-Frame-Options', 'DENY');
```

**Parameters:**
- `name` (string): Header name
- `value` (string): Header value

## CSRFProtection

Cross-Site Request Forgery protection.

### Constructor

```js
new CSRFProtection(options)
```

**Parameters:**
- `options` (object): CSRF protection options

### Methods

#### generateToken()

Generate CSRF token.

```js
const token = csrf.generateToken();
```

**Returns:** CSRF token string

#### validateToken(token, sessionId)

Validate CSRF token.

```js
const isValid = csrf.validateToken(token, sessionId);
```

**Parameters:**
- `token` (string): CSRF token
- `sessionId` (string): Session ID

**Returns:** Boolean indicating validity

## XSSPrevention

Cross-Site Scripting prevention utilities.

### Methods

#### sanitize(input)

Sanitize user input.

```js
const safeInput = xssPrevention.sanitize(userInput);
```

**Parameters:**
- `input` (string): User input

**Returns:** Sanitized string

#### escapeHtml(input)

Escape HTML characters.

```js
const escaped = xssPrevention.escapeHtml('<script>alert("xss")</script>');
```

**Parameters:**
- `input` (string): HTML string

**Returns:** Escaped HTML string

## DDoSMitigation

DDoS attack mitigation utilities.

### Constructor

```js
new DDoSMitigation(options)
```

**Parameters:**
- `options` (object): DDoS mitigation options

### Methods

#### checkRequest(request)

Check request for DDoS patterns.

```js
const isAllowed = await ddos.checkRequest(request);
```

**Parameters:**
- `request` (Request): HTTP request

**Returns:** Promise resolving to boolean

#### getStats()

Get DDoS statistics.

```js
const stats = ddos.getStats();
```

**Returns:** DDoS statistics object

## Type Definitions

### SecurityHeadersOptions

```typescript
interface SecurityHeadersOptions {
  contentSecurityPolicy?: string;
  hsts?: HSTSOptions;
  cors?: CORSOptions;
  frameOptions?: string;
}
```

### CSRFOptions

```typescript
interface CSRFOptions {
  secret?: string;
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
}
```

### DDoSOptions

```typescript
interface DDoSOptions {
  maxRequests?: number;
  windowMs?: number;
  blockDuration?: number;
  whitelist?: string[];
}
```