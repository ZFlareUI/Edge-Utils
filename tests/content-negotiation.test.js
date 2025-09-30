/**
 * Content Negotiation Tests
 * Production-ready test suite for HTTP content negotiation utilities
 */

const {
  ContentNegotiator,
  QualityValue,
  createContentNegotiationMiddleware
} = require('../src/content-negotiation');

describe('ContentNegotiator', () => {
  let negotiator;

  beforeEach(() => {
    negotiator = new ContentNegotiator({
      defaultContentType: 'application/json',
      defaultLanguage: 'en',
      defaultEncoding: 'gzip',
      defaultCharset: 'utf-8',
      supportedTypes: ['application/json', 'application/xml', 'text/html'],
      supportedLanguages: ['en', 'es', 'fr'],
      supportedEncodings: ['gzip', 'deflate', 'identity'],
      supportedCharsets: ['utf-8', 'iso-8859-1']
    });
  });

  describe('Content Type Negotiation', () => {
    test('negotiates exact content type match', () => {
      const result = negotiator.negotiateContentType('application/json');
      expect(result).toBe('application/json');
    });

    test('negotiates with quality values', () => {
      const result = negotiator.negotiateContentType('application/xml;q=0.9, application/json;q=0.8');
      expect(result).toBe('application/xml');
    });

    test('handles wildcard matching', () => {
      const result = negotiator.negotiateContentType('text/*');
      expect(result).toBe('text/html');
    });

    test('falls back to default when no match', () => {
      const result = negotiator.negotiateContentType('application/pdf');
      expect(result).toBe('application/json');
    });

    test('handles empty accept header', () => {
      const result = negotiator.negotiateContentType('');
      expect(result).toBe('application/json');
    });

    test('handles malformed accept header gracefully', () => {
      const result = negotiator.negotiateContentType('invalid,,header');
      expect(result).toBe('application/json');
    });
  });

  describe('Language Negotiation', () => {
    test('negotiates exact language match', () => {
      const result = negotiator.negotiateLanguage('es');
      expect(result).toBe('es');
    });

    test('negotiates with quality values and fallbacks', () => {
      const result = negotiator.negotiateLanguage('fr;q=0.8, de;q=0.6, en;q=0.9');
      expect(result).toBe('en');
    });

    test('handles language ranges', () => {
      const result = negotiator.negotiateLanguage('en-US, en;q=0.8');
      expect(result).toBe('en');
    });
  });

  describe('Encoding Negotiation', () => {
    test('negotiates compression encoding', () => {
      const result = negotiator.negotiateEncoding('gzip, deflate');
      expect(result).toBe('gzip');
    });

    test('prefers identity when no compression supported', () => {
      const noCompressionNegotiator = new ContentNegotiator({
        supportedEncodings: ['identity']
      });
      const result = noCompressionNegotiator.negotiateEncoding('gzip, deflate');
      expect(result).toBe('identity');
    });
  });

  describe('Charset Negotiation', () => {
    test('negotiates charset with quality values', () => {
      const result = negotiator.negotiateCharset('utf-8;q=0.9, iso-8859-1;q=0.8');
      expect(result).toBe('utf-8');
    });
  });

  describe('Header Parsing', () => {
    test('parses accept header with quality values', () => {
      const parsed = negotiator.parseAcceptHeader('text/html;q=0.8, application/json;q=0.9');
      expect(parsed).toHaveLength(2);
      expect(parsed[0].value).toBe('application/json');
      expect(parsed[0].quality).toBe(0.9);
      expect(parsed[1].value).toBe('text/html');
      expect(parsed[1].quality).toBe(0.8);
    });

    test('parses accept header without quality values', () => {
      const parsed = negotiator.parseAcceptHeader('text/html, application/json');
      expect(parsed).toHaveLength(2);
      expect(parsed[0].quality).toBe(1.0);
      expect(parsed[1].quality).toBe(1.0);
    });

    test('handles invalid quality values', () => {
      const parsed = negotiator.parseAcceptHeader('text/html;q=invalid, application/json;q=1.5');
      expect(parsed[0].value).toBe('text/html');
      expect(parsed[0].quality).toBe(1.0); // Invalid quality defaults to 1.0
      expect(parsed[1].value).toBe('application/json');
      expect(parsed[1].quality).toBe(1.0); // Out of range quality defaults to 1.0
    });

    test('sorts by quality and specificity', () => {
      const parsed = negotiator.parseAcceptHeader('text/*;q=0.8, text/html;q=0.9, */*;q=0.7');
      expect(parsed[0].value).toBe('text/html');
      expect(parsed[0].quality).toBe(0.9);
      expect(parsed[1].value).toBe('text/*');
      expect(parsed[1].quality).toBe(0.8);
      expect(parsed[2].value).toBe('*/*');
      expect(parsed[2].quality).toBe(0.7);
    });
  });

  describe('Specificity Calculation', () => {
    test('calculates specificity correctly', () => {
      expect(negotiator.calculateSpecificity('*/*')).toBe(1);
      expect(negotiator.calculateSpecificity('text/*')).toBe(2);
      expect(negotiator.calculateSpecificity('text/html')).toBe(3);
      expect(negotiator.calculateSpecificity('invalid')).toBe(0);
    });
  });

  describe('Best Match Algorithm', () => {
    test('finds direct match', () => {
      const accepted = [{ value: 'application/json', quality: 1.0 }];
      const available = ['application/json', 'application/xml'];
      const result = negotiator.findBestMatch(accepted, available, 'text/plain');
      expect(result).toBe('application/json');
    });

    test('finds wildcard match', () => {
      const accepted = [{ value: 'text/*', quality: 1.0 }];
      const available = ['application/json', 'text/html'];
      const result = negotiator.findBestMatch(accepted, available, 'text/plain');
      expect(result).toBe('text/html');
    });

    test('handles no match with fallback', () => {
      const accepted = [{ value: 'application/pdf', quality: 1.0 }];
      const available = ['application/json', 'application/xml'];
      const result = negotiator.findBestMatch(accepted, available, 'text/plain');
      expect(result).toBe('text/plain');
    });
  });

  describe('Complete Negotiation', () => {
    test('negotiates all aspects from headers', () => {
      const headers = {
        'accept': 'application/xml;q=0.9, application/json',
        'accept-language': 'es, en;q=0.8',
        'accept-encoding': 'gzip, deflate',
        'accept-charset': 'iso-8859-1, utf-8;q=0.9'
      };

      const result = negotiator.negotiate(headers);
      expect(result.contentType).toBe('application/json');
      expect(result.language).toBe('es');
      expect(result.encoding).toBe('gzip');
      expect(result.charset).toBe('iso-8859-1');
    });

    test('handles case-insensitive headers', () => {
      const headers = {
        'Accept': 'application/json',
        'ACCEPT-LANGUAGE': 'fr',
        'accept-Encoding': 'deflate'
      };

      const result = negotiator.negotiate(headers);
      expect(result.contentType).toBe('application/json');
      expect(result.language).toBe('fr');
      expect(result.encoding).toBe('deflate');
    });
  });

  describe('Configuration', () => {
    test('sets and gets supported options', () => {
      negotiator.setSupportedOptions({
        contentTypes: ['text/plain'],
        languages: ['de'],
        encodings: ['compress'],
        charsets: ['ascii']
      });

      const options = negotiator.getSupportedOptions();
      expect(options.contentTypes).toEqual(['text/plain']);
      expect(options.languages).toEqual(['de']);
      expect(options.encodings).toEqual(['compress']);
      expect(options.charsets).toEqual(['ascii']);
    });
  });
});

describe('QualityValue', () => {
  describe('Parse Method', () => {
    test('parses value with quality parameter', () => {
      const result = QualityValue.parse('text/html;q=0.8');
      expect(result.value).toBe('text/html');
      expect(result.quality).toBe(0.8);
    });

    test('parses value without quality parameter', () => {
      const result = QualityValue.parse('application/json');
      expect(result.value).toBe('application/json');
      expect(result.quality).toBe(1.0);
    });

    test('handles invalid quality values', () => {
      const result = QualityValue.parse('text/plain;q=invalid');
      expect(result.value).toBe('text/plain');
      expect(result.quality).toBe(1.0);
    });

    test('handles empty input', () => {
      const result = QualityValue.parse('');
      expect(result.value).toBe('');
      expect(result.quality).toBe(1.0);
    });
  });

  describe('Sort Method', () => {
    test('sorts by quality value descending', () => {
      const items = [
        { type: 'text/html', quality: 0.8 },
        { type: 'application/json', quality: 0.9 },
        { type: 'text/plain', quality: 0.7 }
      ];

      const sorted = QualityValue.sortByQuality(items);
      expect(sorted[0].type).toBe('application/json');
      expect(sorted[1].type).toBe('text/html');
      expect(sorted[2].type).toBe('text/plain');
    });

    test('handles items without quality property', () => {
      const items = [
        { type: 'text/html' },  // no quality, defaults to 1.0
        { type: 'application/json', quality: 0.9 }  // explicit quality 0.9
      ];

      const sorted = QualityValue.sortByQuality(items);
      expect(sorted[0].type).toBe('text/html');  // 1.0 quality comes first
      expect(sorted[1].type).toBe('application/json');  // 0.9 quality comes second
    });
  });
});

describe('Content Negotiation Middleware', () => {
  test('creates middleware that negotiates content', () => {
    const middleware = createContentNegotiationMiddleware({
      supportedTypes: ['application/json', 'text/html']
    });

    const request = {
      headers: {
        'accept': 'text/html, application/json;q=0.5',
        'accept-language': 'en'
      }
    };

    const result = middleware(request, {});

    expect(result.context.contentNegotiation.contentType).toBe('text/html');
    expect(result.context.contentNegotiation.language).toBe('en');
    expect(typeof result.context.getPreferredContentType).toBe('function');
    expect(result.context.getPreferredContentType()).toBe('text/html');
  });

  test('preserves existing context', () => {
    const middleware = createContentNegotiationMiddleware();

    const request = { headers: {} };
    const existingContext = { user: { id: 123 } };

    const result = middleware(request, existingContext);

    expect(result.context.user.id).toBe(123);
    expect(result.context.contentNegotiation).toBeDefined();
  });

  test('handles requests without headers', () => {
    const middleware = createContentNegotiationMiddleware();

    const request = {};
    const result = middleware(request, {});

    expect(result.context.contentNegotiation.contentType).toBe('application/json');
    expect(result.context.contentNegotiation.language).toBe('en');
  });
});