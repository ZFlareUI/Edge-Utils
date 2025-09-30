/**
 * Content Negotiation Utilities
 * Production-ready implementation for HTTP content negotiation
 * Supports Accept, Accept-Language, Accept-Encoding, and Accept-Charset headers
 */

class ContentNegotiator {
  constructor(options = {}) {
    this.defaultContentType = options.defaultContentType || 'application/json';
    this.defaultLanguage = options.defaultLanguage || 'en';
    this.defaultEncoding = options.defaultEncoding || 'identity';
    this.defaultCharset = options.defaultCharset || 'utf-8';
    this.supportedTypes = options.supportedTypes || [];
    this.supportedLanguages = options.supportedLanguages || [];
    this.supportedEncodings = options.supportedEncodings || [];
    this.supportedCharsets = options.supportedCharsets || [];
  }

  /**
   * Negotiate content type from Accept header
   * @param {string} acceptHeader - Accept header value
   * @returns {string} - Best matching content type
   */
  negotiateContentType(acceptHeader) {
    if (!acceptHeader) {
      return this.defaultContentType;
    }

    const acceptedTypes = this.parseAcceptHeader(acceptHeader);
    const availableTypes = this.supportedTypes.length > 0
      ? this.supportedTypes
      : [this.defaultContentType];

    return this.findBestMatch(acceptedTypes, availableTypes, this.defaultContentType);
  }

  /**
   * Negotiate language from Accept-Language header
   * @param {string} acceptLanguageHeader - Accept-Language header value
   * @returns {string} - Best matching language
   */
  negotiateLanguage(acceptLanguageHeader) {
    if (!acceptLanguageHeader) {
      return this.defaultLanguage;
    }

    const acceptedLanguages = this.parseAcceptHeader(acceptLanguageHeader);
    const availableLanguages = this.supportedLanguages.length > 0
      ? this.supportedLanguages
      : [this.defaultLanguage];

    return this.findBestMatch(acceptedLanguages, availableLanguages, this.defaultLanguage);
  }

  /**
   * Negotiate encoding from Accept-Encoding header
   * @param {string} acceptEncodingHeader - Accept-Encoding header value
   * @returns {string} - Best matching encoding
   */
  negotiateEncoding(acceptEncodingHeader) {
    if (!acceptEncodingHeader) {
      return this.defaultEncoding;
    }

    const acceptedEncodings = this.parseAcceptHeader(acceptEncodingHeader);
    const availableEncodings = this.supportedEncodings.length > 0
      ? this.supportedEncodings
      : [this.defaultEncoding];

    return this.findBestMatch(acceptedEncodings, availableEncodings, this.defaultEncoding);
  }

  /**
   * Negotiate charset from Accept-Charset header
   * @param {string} acceptCharsetHeader - Accept-Charset header value
   * @returns {string} - Best matching charset
   */
  negotiateCharset(acceptCharsetHeader) {
    if (!acceptCharsetHeader) {
      return this.defaultCharset;
    }

    const acceptedCharsets = this.parseAcceptHeader(acceptCharsetHeader);
    const availableCharsets = this.supportedCharsets.length > 0
      ? this.supportedCharsets
      : [this.defaultCharset];

    return this.findBestMatch(acceptedCharsets, availableCharsets, this.defaultCharset);
  }

  /**
   * Parse Accept* header and return sorted array of media ranges with quality values
   * @param {string} headerValue - Header value to parse
   * @returns {Array} - Array of {value, quality, specificity} objects
   */
  parseAcceptHeader(headerValue) {
    if (!headerValue || typeof headerValue !== 'string') {
      return [];
    }

    const ranges = headerValue.split(',').map(range => range.trim());
    const parsedRanges = [];

    for (const range of ranges) {
      const parts = range.split(';');
      const value = parts[0].trim().toLowerCase();

      // Parse quality value
      let quality = 1.0;
      for (let i = 1; i < parts.length; i++) {
        const param = parts[i].trim();
        if (param.startsWith('q=')) {
          const qValue = parseFloat(param.substring(2));
          if (!isNaN(qValue) && qValue >= 0 && qValue <= 1) {
            quality = qValue;
          }
          break;
        }
      }

      // Calculate specificity (more specific = higher priority)
      const specificity = this.calculateSpecificity(value);

      parsedRanges.push({
        value,
        quality,
        specificity,
        original: range
      });
    }

    // Sort by quality (descending), then by specificity (descending)
    return parsedRanges.sort((a, b) => {
      if (Math.abs(a.quality - b.quality) > 0.001) {
        return b.quality - a.quality;
      }
      return b.specificity - a.specificity;
    });
  }

  /**
   * Calculate specificity score for a media range
   * @param {string} mediaRange - Media range (e.g., text/html, text/star, star/star)
   * @returns {number} - Specificity score (higher = more specific)
   */
  calculateSpecificity(mediaRange) {
    if (mediaRange === '*/*') return 1;
    if (mediaRange.endsWith('/*')) return 2;
    if (mediaRange.includes('/')) return 3;
    return 0; // Invalid format
  }

  /**
   * Find best match between accepted and available options
   * @param {Array} accepted - Array of accepted options with quality values
   * @param {Array} available - Array of available options
   * @param {string} fallback - Fallback option
   * @returns {string} - Best matching option
   */
  findBestMatch(accepted, available, fallback) {
    // Create case-insensitive sets for faster lookup
    const availableSet = new Set(available.map(a => a.toLowerCase()));
    const availableMap = new Map(available.map(a => [a.toLowerCase(), a]));

    // Find best match based on client preferences
    for (const acceptedOption of accepted) {
      const acceptedValue = acceptedOption.value;

      // Direct match
      if (availableSet.has(acceptedValue)) {
        return availableMap.get(acceptedValue);
      }

      // Wildcard matching
      if (acceptedValue === '*/*') {
        continue; // Skip wildcards, we'll handle them later
      }

      // Type/* matching (e.g., text/* matches text/html)
      if (acceptedValue.endsWith('/*')) {
        const type = acceptedValue.slice(0, -2);
        for (const availableOption of available) {
          if (availableOption.toLowerCase().startsWith(type + '/')) {
            return availableOption;
          }
        }
      }

      // Subtype matching (e.g., text/html matches text/*)
      if (acceptedValue.includes('/')) {
        const [type] = acceptedValue.split('/');
        for (const availableOption of available) {
          const availableLower = availableOption.toLowerCase();
          if (availableLower.startsWith(type + '/') && availableLower.endsWith('/*')) {
            return availableOption;
          }
        }
      }
    }

    // If no specific match found, return fallback
    return fallback;
  }

  /**
   * Negotiate all content aspects from request headers
   * @param {Object} headers - Request headers object
   * @returns {Object} - Negotiation results
   */
  negotiate(headers = {}) {
    // Create case-insensitive header lookup
    const headerLookup = {};
    for (const [key, value] of Object.entries(headers)) {
      headerLookup[key.toLowerCase()] = value;
    }

    return {
      contentType: this.negotiateContentType(headerLookup['accept']),
      language: this.negotiateLanguage(headerLookup['accept-language']),
      encoding: this.negotiateEncoding(headerLookup['accept-encoding']),
      charset: this.negotiateCharset(headerLookup['accept-charset'])
    };
  }

  /**
   * Set supported options for negotiation
   * @param {Object} options - Supported options
   */
  setSupportedOptions(options = {}) {
    if (options.contentTypes) this.supportedTypes = options.contentTypes;
    if (options.languages) this.supportedLanguages = options.languages;
    if (options.encodings) this.supportedEncodings = options.encodings;
    if (options.charsets) this.supportedCharsets = options.charsets;
  }

  /**
   * Get current supported options
   * @returns {Object} - Supported options
   */
  getSupportedOptions() {
    return {
      contentTypes: this.supportedTypes,
      languages: this.supportedLanguages,
      encodings: this.supportedEncodings,
      charsets: this.supportedCharsets
    };
  }
}

/**
 * Quality Value Utilities
 */
class QualityValue {
  /**
   * Parse quality value from string
   * @param {string} value - Value with optional quality parameter
   * @returns {Object} - {value, quality}
   */
  static parse(value) {
    if (!value || typeof value !== 'string') {
      return { value: '', quality: 1.0 };
    }

    const parts = value.split(';');
    const mainValue = parts[0].trim();
    let quality = 1.0;

    for (let i = 1; i < parts.length; i++) {
      const param = parts[i].trim();
      if (param.startsWith('q=')) {
        const qValue = parseFloat(param.substring(2));
        if (!isNaN(qValue) && qValue >= 0 && qValue <= 1) {
          quality = qValue;
        }
        break;
      }
    }

    return { value: mainValue, quality };
  }

  /**
   * Sort array by quality value (highest first)
   * @param {Array} items - Array of items with quality values
   * @returns {Array} - Sorted array
   */
  static sortByQuality(items) {
    return items.sort((a, b) => {
      const aQuality = typeof a.quality === 'number' ? a.quality : 1.0;
      const bQuality = typeof b.quality === 'number' ? b.quality : 1.0;
      return bQuality - aQuality;
    });
  }
}

/**
 * Content Negotiation Middleware Factory
 * @param {Object} options - Configuration options
 * @returns {Function} - Middleware function
 */
function createContentNegotiationMiddleware(options = {}) {
  const negotiator = new ContentNegotiator(options);

  return function contentNegotiationMiddleware(request, context = {}) {
    const headers = request.headers || {};

    // Perform negotiation
    const negotiationResult = negotiator.negotiate(headers);

    // Attach results to request context
    if (!context.contentNegotiation) {
      context.contentNegotiation = {};
    }

    Object.assign(context.contentNegotiation, negotiationResult);

    // Add convenience methods
    context.getPreferredContentType = () => negotiationResult.contentType;
    context.getPreferredLanguage = () => negotiationResult.language;
    context.getPreferredEncoding = () => negotiationResult.encoding;
    context.getPreferredCharset = () => negotiationResult.charset;

    return { request, context };
  };
}

module.exports = {
  ContentNegotiator,
  QualityValue,
  createContentNegotiationMiddleware
};