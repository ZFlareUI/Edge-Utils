/**
 * Content Negotiation Example
 * Demonstrates how to use the Edge-Utils content negotiation module
 */

const { ContentNegotiator, createContentNegotiationMiddleware } = require('../src/content-negotiation');

// Example 1: Basic Content Negotiation
console.log('=== Basic Content Negotiation ===');

const negotiator = new ContentNegotiator({
  supportedTypes: ['application/json', 'application/xml', 'text/html'],
  supportedLanguages: ['en', 'es', 'fr'],
  supportedEncodings: ['gzip', 'deflate', 'identity'],
  supportedCharsets: ['utf-8', 'iso-8859-1']
});

// Simulate client request headers
const requestHeaders = {
  'accept': 'application/json;q=0.9, application/xml;q=0.8, text/html',
  'accept-language': 'en-US, es;q=0.8, fr;q=0.6',
  'accept-encoding': 'gzip, deflate',
  'accept-charset': 'utf-8, iso-8859-1;q=0.9'
};

const result = negotiator.negotiate(requestHeaders);
console.log('Negotiation Result:', result);
// Output: { contentType: 'application/json', language: 'en', encoding: 'gzip', charset: 'utf-8' }

// Example 2: Individual Negotiations
console.log('\n=== Individual Negotiations ===');

console.log('Content Type:', negotiator.negotiateContentType('text/html, application/json;q=0.5'));
// Output: application/json (higher quality value wins)

console.log('Language:', negotiator.negotiateLanguage('fr, en;q=0.9'));
// Output: en (higher quality value wins)

console.log('Encoding:', negotiator.negotiateEncoding('compress, gzip;q=0.8'));
// Output: gzip (only supported encoding in the list)

// Example 3: Middleware Usage
console.log('\n=== Middleware Usage ===');

const middleware = createContentNegotiationMiddleware({
  supportedTypes: ['application/json', 'text/html'],
  supportedLanguages: ['en', 'es']
});

const mockRequest = {
  headers: {
    'accept': 'text/html, application/json;q=0.5',
    'accept-language': 'es, en;q=0.8'
  }
};

const mockContext = {};
const processed = middleware(mockRequest, mockContext);

console.log('Context after middleware:', processed.context.contentNegotiation);
// Output: { contentType: 'text/html', language: 'es', encoding: 'gzip', charset: 'utf-8' }

console.log('Preferred content type:', processed.context.getPreferredContentType());
// Output: text/html

// Example 4: Wildcard Matching
console.log('\n=== Wildcard Matching ===');

const wildcardNegotiator = new ContentNegotiator({
  supportedTypes: ['application/json', 'text/html', 'text/plain']
});

console.log('Wildcard match:', wildcardNegotiator.negotiateContentType('text/*'));
// Output: text/html (first matching type)

console.log('No match fallback:', wildcardNegotiator.negotiateContentType('image/*'));
// Output: application/json (default fallback)

// Example 5: Quality Value Handling
console.log('\n=== Quality Value Handling ===');

const { QualityValue } = require('../src/content-negotiation');

const parsed = QualityValue.parse('text/html;q=0.8');
console.log('Parsed quality value:', parsed);
// Output: { value: 'text/html', quality: 0.8 }

const items = [
  { type: 'text/html', quality: 0.8 },
  { type: 'application/json', quality: 0.9 },
  { type: 'text/plain' } // defaults to 1.0
];

const sorted = QualityValue.sortByQuality(items);
console.log('Sorted by quality:', sorted.map(item => `${item.type} (${item.quality || 1.0})`));
// Output: ['text/plain (1)', 'application/json (0.9)', 'text/html (0.8)']

console.log('\nContent Negotiation examples completed!');