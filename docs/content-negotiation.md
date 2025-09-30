# Content Negotiation & Response Formatting

The content negotiation utilities provide intelligent content type detection, response formatting, and media type handling for edge environments. These utilities help deliver the right content format to clients while optimizing for performance and compatibility.

## Features

- Content Type Detection: Automatic content type negotiation
- Format Conversion: Convert between JSON, XML, CSV, and other formats
- Media Type Handling: Support for custom media types and quality values
- Performance Optimized: Efficient parsing and serialization
- Internationalization: Character encoding and language negotiation
- Compression: Automatic content compression
- Content Validation: Schema validation and sanitization
- Client Preferences: Respect Accept headers and client capabilities

## Quick Start

```js
const { ContentNegotiator, ResponseFormatter } = require('edge-utils/content-negotiation');

// Create content negotiator
const negotiator = new ContentNegotiator({
  supportedTypes: ['application/json', 'application/xml', 'text/csv'],
  defaultType: 'application/json'
});

// Create response formatter
const formatter = new ResponseFormatter({
  compression: true,
  prettyPrint: false
});

// Use in request handler
const handler = async (request) => {
  // Negotiate content type
  const contentType = negotiator.negotiate(request);

  // Get data
  const data = await getData();

  // Format response
  const response = await formatter.format(data, {
    contentType,
    status: 200,
    headers: { 'X-API-Version': '1.0' }
  });

  return response;
};
```

## Content Negotiation

### Accept Header Parsing

Parse and interpret HTTP Accept headers for content type negotiation.

```js
const negotiator = new ContentNegotiator({
  supportedTypes: [
    'application/json',
    'application/xml',
    'text/html',
    'text/plain',
    'application/octet-stream'
  ],
  defaultType: 'application/json',
  qualityFactor: true  // Support q= quality values
});

// Negotiate content type
const contentType = negotiator.negotiate(request);
console.log(contentType); // 'application/json;q=0.9'

// Handle multiple accept types
const accepts = negotiator.parseAccept(request.headers.get('Accept'));
console.log(accepts);
// Output:
// [
//   { type: 'application/json', quality: 1.0 },
//   { type: 'application/xml', quality: 0.8 },
//   { type: 'text/html', quality: 0.5 }
// ]
```

### Media Type Matching

Advanced media type matching with wildcards and parameters.

```js
const negotiator = new ContentNegotiator({
  supportedTypes: [
    'application/json',
    'application/xml',
    'application/vnd.api+json',
    'text/*',  // Wildcard support
    'application/*+json'  // Suffix matching
  ]
});

// Exact match
negotiator.negotiate('Accept: application/json'); // 'application/json'

// Wildcard matching
negotiator.negotiate('Accept: text/*'); // 'text/plain'

// Suffix matching
negotiator.negotiate('Accept: application/vnd.api+json'); // 'application/vnd.api+json'

// Quality-based selection
negotiator.negotiate('Accept: application/xml;q=0.9, application/json;q=1.0');
// Returns: 'application/json'
```

### Custom Negotiation Logic

Implement custom content negotiation strategies.

```js
class CustomNegotiator extends ContentNegotiator {
  negotiate(request) {
    // Custom logic based on user agent
    const ua = request.headers.get('User-Agent');

    if (ua.includes('Mobile')) {
      return 'application/json'; // Prefer JSON for mobile
    }

    if (ua.includes('Legacy')) {
      return 'text/xml'; // XML for legacy clients
    }

    // Fall back to default negotiation
    return super.negotiate(request);
  }
}

const customNegotiator = new CustomNegotiator({
  supportedTypes: ['application/json', 'text/xml', 'text/csv']
});
```

## Response Formatting

### JSON Formatting

Format data as JSON with customization options.

```js
const formatter = new ResponseFormatter({
  json: {
    prettyPrint: true,      // Pretty print JSON
    replacer: (key, value) => {
      // Custom serialization
      if (key === 'password') return '[REDACTED]';
      return value;
    },
    space: 2,              // Indentation spaces
    circular: 'ignore'     // Handle circular references
  }
});

// Format JSON response
const data = { user: 'john', password: 'secret', metadata: { id: 123 } };
const response = await formatter.format(data, {
  contentType: 'application/json',
  status: 200
});

console.log(await response.text());
// Output:
// {
//   "user": "john",
//   "password": "[REDACTED]",
//   "metadata": {
//     "id": 123
//   }
// }
```

### XML Formatting

Convert data structures to XML format.

```js
const xmlFormatter = new ResponseFormatter({
  xml: {
    rootElement: 'response',
    itemElement: 'item',
    attributes: true,      // Include attributes
    cdata: ['description'], // Wrap in CDATA
    namespaces: {
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    }
  }
});

// Format XML response
const data = {
  users: [
    { id: 1, name: 'John', role: 'admin' },
    { id: 2, name: 'Jane', role: 'user' }
  ],
  metadata: {
    total: 2,
    page: 1
  }
};

const response = await xmlFormatter.format(data, {
  contentType: 'application/xml',
  status: 200
});

console.log(await response.text());
// Output:
// <?xml version="1.0" encoding="UTF-8"?>
// <response xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
//   <users>
//     <item id="1">
//       <name>John</name>
//       <role>admin</role>
//     </item>
//     <item id="2">
//       <name>Jane</name>
//       <role>user</role>
//     </item>
//   </users>
//   <metadata>
//     <total>2</total>
//     <page>1</page>
//   </metadata>
// </response>
```

### CSV Formatting

Generate CSV responses from tabular data.

```js
const csvFormatter = new ResponseFormatter({
  csv: {
    delimiter: ',',        // Field delimiter
    quote: '"',           // Quote character
    escape: '"',          // Escape character
    header: true,         // Include header row
    lineBreak: '\n',      // Line break character
    encoding: 'utf-8'     // Character encoding
  }
});

// Format CSV response
const data = [
  { name: 'John', age: 30, city: 'New York' },
  { name: 'Jane', age: 25, city: 'London' },
  { name: 'Bob', age: 35, city: 'Paris' }
];

const response = await csvFormatter.format(data, {
  contentType: 'text/csv',
  status: 200,
  headers: {
    'Content-Disposition': 'attachment; filename="users.csv"'
  }
});

console.log(await response.text());
// Output:
// name,age,city
// John,30,New York
// Jane,25,London
// Bob,35,Paris
```

### Custom Formatters

Create custom response formatters for specialized content types.

```js
class CustomFormatter extends ResponseFormatter {
  async formatYAML(data, options) {
    const yaml = await import('js-yaml');
    const content = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    return new Response(content, {
      status: options.status || 200,
      headers: {
        'Content-Type': 'application/yaml',
        ...options.headers
      }
    });
  }

  async formatMsgPack(data, options) {
    const msgpack = await import('@msgpack/msgpack');
    const content = msgpack.encode(data);

    return new Response(content, {
      status: options.status || 200,
      headers: {
        'Content-Type': 'application/msgpack',
        ...options.headers
      }
    });
  }
}

const customFormatter = new CustomFormatter();

// Use custom formatters
const yamlResponse = await customFormatter.formatYAML(data, {
  contentType: 'application/yaml'
});

const msgpackResponse = await customFormatter.formatMsgPack(data, {
  contentType: 'application/msgpack'
});
```

## Content Compression

### Automatic Compression

Automatically compress responses based on client capabilities.

```js
const compressedFormatter = new ResponseFormatter({
  compression: {
    enabled: true,
    algorithms: ['gzip', 'deflate', 'br'],  // Supported algorithms
    threshold: 1024,     // Minimum size to compress (bytes)
    level: 6,           // Compression level (1-9)
    types: [            // Content types to compress
      'application/json',
      'application/xml',
      'text/*'
    ]
  }
});

// Compression is automatically applied
const response = await compressedFormatter.format(largeData, {
  contentType: 'application/json'
});

// Response includes appropriate Content-Encoding header
console.log(response.headers.get('Content-Encoding')); // 'gzip'
```

### Manual Compression

Control compression manually for specific use cases.

```js
const compressor = new ContentCompressor({
  algorithm: 'gzip',
  level: 9,
  chunkSize: 16384  // 16KB chunks
});

// Compress data manually
const compressed = await compressor.compress(JSON.stringify(data));

// Create response with compressed content
const response = new Response(compressed, {
  headers: {
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip',
    'Content-Length': compressed.length.toString()
  }
});
```

## Character Encoding

### Encoding Detection and Conversion

Handle different character encodings automatically.

```js
const encodingHandler = new EncodingHandler({
  defaultEncoding: 'utf-8',
  supportedEncodings: ['utf-8', 'iso-8859-1', 'windows-1252'],
  detectBOM: true  // Detect byte order marks
});

// Detect encoding from request
const requestEncoding = encodingHandler.detectEncoding(request);

// Convert response encoding
const encodedResponse = await encodingHandler.encodeResponse(data, {
  encoding: requestEncoding,
  contentType: 'text/plain'
});
```

### Internationalization Support

Handle internationalization and localization in responses.

```js
const i18nFormatter = new ResponseFormatter({
  i18n: {
    enabled: true,
    locales: ['en-US', 'fr-FR', 'es-ES'],
    defaultLocale: 'en-US',
    dateFormat: 'short',
    numberFormat: 'decimal'
  }
});

// Format with localization
const data = {
  message: 'Welcome',
  date: new Date(),
  price: 1234.56
};

const response = await i18nFormatter.format(data, {
  contentType: 'application/json',
  locale: 'fr-FR'  // French formatting
});

// Dates and numbers formatted for French locale
```

## Content Validation

### Schema Validation

Validate response data against schemas before formatting.

```js
const validator = new ContentValidator({
  schemas: {
    'application/json': {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      },
      required: ['id', 'name']
    }
  },
  strict: true,  // Reject invalid data
  sanitize: true // Sanitize data
});

const validatedFormatter = new ResponseFormatter({
  validator
});

// Validation happens automatically during formatting
try {
  const response = await validatedFormatter.format(invalidData, {
    contentType: 'application/json'
  });
} catch (error) {
  console.error('Validation error:', error.message);
}
```

### Content Sanitization

Sanitize content to prevent XSS and other security issues.

```js
const sanitizer = new ContentSanitizer({
  rules: {
    html: {
      allowedTags: ['p', 'br', 'strong', 'em'],
      allowedAttributes: {
        'a': ['href'],
        'img': ['src', 'alt']
      }
    },
    json: {
      maxDepth: 10,      // Maximum nesting depth
      maxLength: 10000,  // Maximum string length
      allowedTypes: ['string', 'number', 'boolean', 'object', 'array']
    }
  }
});

const safeFormatter = new ResponseFormatter({
  sanitizer
});

// Content is sanitized during formatting
const unsafeData = {
  description: '<script>alert("xss")</script><p>Safe content</p>'
};

const response = await safeFormatter.format(unsafeData, {
  contentType: 'application/json'
});
// description becomes: "<p>Safe content</p>"
```

## Middleware Integration

### Content Negotiation Middleware

```js
const { ContentNegotiator, ResponseFormatter } = require('edge-utils/content-negotiation');

// Create negotiator and formatter
const negotiator = new ContentNegotiator({
  supportedTypes: ['application/json', 'application/xml', 'text/csv'],
  defaultType: 'application/json'
});

const formatter = new ResponseFormatter({
  compression: true,
  json: { prettyPrint: true }
});

// Content negotiation middleware
const contentNegotiationMiddleware = async (request, context) => {
  // Negotiate content type
  const contentType = negotiator.negotiate(request);
  context.contentType = contentType;

  // Set Accept header for downstream processing
  context.accept = contentType;

  return context.next();
};

// Response formatting middleware
const responseFormattingMiddleware = async (request, context) => {
  const response = await context.next();

  // Only format JSON responses
  if (context.contentType === 'application/json') {
    const data = await response.json();

    // Re-format with consistent settings
    const formattedResponse = await formatter.format(data, {
      contentType: context.contentType,
      status: response.status,
      headers: response.headers
    });

    return formattedResponse;
  }

  return response;
};

// Apply middleware
const handler = applyMiddleware([
  contentNegotiationMiddleware,
  responseFormattingMiddleware
], baseHandler);
```

### API Versioning Middleware

```js
// API versioning based on content type
const apiVersioningMiddleware = async (request, context) => {
  const accept = request.headers.get('Accept') || '';

  // Extract version from Accept header
  const versionMatch = accept.match(/application\/vnd\.api\.v(\d+)\+json/);
  if (versionMatch) {
    context.apiVersion = parseInt(versionMatch[1]);
  } else {
    context.apiVersion = 1; // Default version
  }

  // Set response content type with version
  context.responseContentType = `application/vnd.api.v${context.apiVersion}+json`;

  return context.next();
};
```

## Advanced Examples

### REST API with Content Negotiation

```js
const { ContentNegotiator, ResponseFormatter } = require('edge-utils/content-negotiation');

// REST API with full content negotiation
class RESTAPI {
  constructor() {
    this.negotiator = new ContentNegotiator({
      supportedTypes: [
        'application/json',
        'application/xml',
        'application/vnd.api+json',
        'text/csv'
      ],
      defaultType: 'application/json'
    });

    this.formatter = new ResponseFormatter({
      compression: true,
      json: { prettyPrint: false },
      xml: { rootElement: 'api-response' }
    });
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    const contentType = this.negotiator.negotiate(request);

    try {
      let data;

      // Route based on path
      switch (url.pathname) {
        case '/api/users':
          data = await this.getUsers(request);
          break;
        case '/api/orders':
          data = await this.getOrders(request);
          break;
        default:
          return new Response('Not found', { status: 404 });
      }

      // Format response
      const response = await this.formatter.format(data, {
        contentType,
        status: 200,
        headers: {
          'X-API-Version': '1.0',
          'Cache-Control': 'public, max-age=300'
        }
      });

      return response;

    } catch (error) {
      // Format error response
      const errorData = {
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
          details: error.details
        }
      };

      const errorResponse = await this.formatter.format(errorData, {
        contentType,
        status: error.status || 500
      });

      return errorResponse;
    }
  }

  async getUsers(request) {
    // Simulate data fetching
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];

    // Apply content type specific transformations
    const contentType = this.negotiator.negotiate(request);

    if (contentType === 'text/csv') {
      // CSV format doesn't need object transformation
      return users;
    }

    // JSON/XML format
    return {
      users,
      metadata: {
        total: users.length,
        page: 1,
        links: {
          self: '/api/users',
          next: '/api/users?page=2'
        }
      }
    };
  }
}

const api = new RESTAPI();
const handler = (request) => api.handleRequest(request);
```

### GraphQL API with Content Negotiation

```js
const { ContentNegotiator, ResponseFormatter } = require('edge-utils/content-negotiation');

// GraphQL API with content negotiation
class GraphQLAPI {
  constructor() {
    this.negotiator = new ContentNegotiator({
      supportedTypes: [
        'application/json',
        'application/graphql-response+json'
      ],
      defaultType: 'application/json'
    });

    this.formatter = new ResponseFormatter({
      json: { prettyPrint: false }
    });
  }

  async handleRequest(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const contentType = this.negotiator.negotiate(request);
    const body = await request.json();

    try {
      // Execute GraphQL query
      const result = await this.executeGraphQL(body.query, body.variables);

      // Format response
      const response = await this.formatter.format(result, {
        contentType,
        status: 200,
        headers: {
          'X-Content-Type-Options': 'nosniff'
        }
      });

      return response;

    } catch (error) {
      // Format GraphQL error
      const errorResult = {
        errors: [{
          message: error.message,
          locations: error.locations,
          path: error.path
        }]
      };

      const errorResponse = await this.formatter.format(errorResult, {
        contentType,
        status: 200  // GraphQL always returns 200
      });

      return errorResponse;
    }
  }

  async executeGraphQL(query, variables) {
    // Simulate GraphQL execution
    return {
      data: {
        users: [
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' }
        ]
      }
    };
  }
}

const graphqlAPI = new GraphQLAPI();
const handler = (request) => graphqlAPI.handleRequest(request);
```

### Streaming Responses

```js
const { ResponseFormatter } = require('edge-utils/content-negotiation');

// Streaming response formatter
class StreamingFormatter extends ResponseFormatter {
  async formatStream(dataStream, options) {
    const contentType = options.contentType || 'application/json';

    // Create transform stream for formatting
    const transformStream = new TransformStream({
      start(controller) {
        if (contentType === 'application/json') {
          controller.enqueue('{"data":[');
        }
      },

      transform(chunk, controller) {
        if (contentType === 'application/json') {
          const jsonChunk = JSON.stringify(chunk);
          controller.enqueue(jsonChunk + ',');
        } else {
          controller.enqueue(chunk);
        }
      },

      flush(controller) {
        if (contentType === 'application/json') {
          controller.enqueue(']}');
        }
      }
    });

    // Pipe through transform
    const formattedStream = dataStream.pipeThrough(transformStream);

    return new Response(formattedStream, {
      status: options.status || 200,
      headers: {
        'Content-Type': contentType,
        'Transfer-Encoding': 'chunked',
        ...options.headers
      }
    });
  }
}

const streamingFormatter = new StreamingFormatter();

// Use for large datasets
const largeDatasetHandler = async (request) => {
  const dataStream = getLargeDatasetStream(); // ReadableStream

  return streamingFormatter.formatStream(dataStream, {
    contentType: 'application/json',
    status: 200
  });
};
```

## Performance Considerations

### Response Caching

Cache formatted responses to improve performance.

```js
const cachedFormatter = new ResponseFormatter({
  caching: {
    enabled: true,
    ttl: 300000,  // 5 minutes
    storage: kvStorage,
    keyGenerator: (data, options) => {
      // Generate cache key based on content
      const hash = await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(JSON.stringify(data)));
      return `response:${options.contentType}:${hash}`;
    }
  }
});
```

### Lazy Formatting

Format responses only when needed.

```js
const lazyFormatter = new ResponseFormatter({
  lazy: true  // Only format when response is actually sent
});

// Response formatting is deferred
const response = lazyFormatter.format(data, options);
// Formatting happens when response.text() or response.json() is called
```

### Memory Management

Handle large responses efficiently.

```js
const memoryEfficientFormatter = new ResponseFormatter({
  streaming: true,  // Use streaming for large responses
  chunkSize: 65536, // 64KB chunks
  maxMemory: 1048576 // 1MB max memory usage
});
```

## Platform-Specific Notes

### Cloudflare Workers
- Compatible with Cloudflare's streaming responses
- Use Cloudflare KV for caching formatted responses
- Support for Cloudflare's compression

### Vercel Edge Functions
- Native streaming support
- Compatible with Vercel's edge network
- Support for Vercel's deployment regions

### Deno Deploy
- Native support for content negotiation
- Compatible with Deno's Web APIs
- Support for streaming responses

## Best Practices

### Content Type Selection

Choose appropriate content types for your API:

```js
// Good content type choices
const contentTypes = {
  // REST APIs
  json: 'application/json',
  jsonApi: 'application/vnd.api+json',

  // Data exchange
  xml: 'application/xml',
  csv: 'text/csv',

  // Specialized
  yaml: 'application/yaml',
  msgpack: 'application/msgpack',

  // Binary data
  octetStream: 'application/octet-stream'
};
```

### Error Response Formatting

Format errors consistently across content types:

```js
const formatError = async (error, contentType) => {
  const errorData = {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString()
    }
  };

  return formatter.format(errorData, {
    contentType,
    status: error.status || 500
  });
};
```

### Content Negotiation Headers

Include helpful headers in responses:

```js
const response = await formatter.format(data, {
  contentType: negotiatedType,
  headers: {
    'Vary': 'Accept',  // Important for caching
    'X-Content-Type-Options': 'nosniff',
    'X-Content-Type': negotiatedType
  }
});
```

## Testing

Run content negotiation tests with:

```bash
npm test -- --testPathPattern=content-negotiation.test.js
```

## API Reference

### ContentNegotiator Methods
- `negotiate(request)` - Negotiate content type for request
- `parseAccept(acceptHeader)` - Parse Accept header
- `supports(type)` - Check if type is supported
- `getSupportedTypes()` - Get all supported types

### ResponseFormatter Methods
- `format(data, options)` - Format data into response
- `formatJSON(data, options)` - Format as JSON
- `formatXML(data, options)` - Format as XML
- `formatCSV(data, options)` - Format as CSV

### ContentCompressor Methods
- `compress(data, algorithm)` - Compress data
- `decompress(data, algorithm)` - Decompress data
- `getSupportedAlgorithms()` - Get supported algorithms

## Contributing

When contributing to content negotiation utilities:

1. Maintain backward compatibility
2. Add comprehensive tests for new formats
3. Update documentation for new features
4. Consider performance impact of changes
5. Test across all supported platforms

## License

MIT</content>
<parameter name="filePath">/Users/pratikacharya/Desktop/package/edge-utils/docs/content-negotiation.md