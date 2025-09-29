const { parseBody, sendJson, sendRedirect, sendStream, setCors } = require('../src/core/utils');

describe('Core Utils', () => {
  describe('parseBody', () => {
    it('should parse JSON body', async () => {
      const request = {
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ key: 'value' })
      };
      const result = await parseBody(request);
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse form data', async () => {
      const request = {
        headers: { get: () => 'application/x-www-form-urlencoded' },
        text: () => Promise.resolve('key=value&foo=bar')
      };
      const result = await parseBody(request);
      expect(result).toEqual({ key: 'value', foo: 'bar' });
    });

    it('should parse plain text', async () => {
      const request = {
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('hello world')
      };
      const result = await parseBody(request);
      expect(result).toBe('hello world');
    });
  });

  describe('sendJson', () => {
    it('should return JSON response', () => {
      const response = sendJson({ data: 'test' });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('setCors', () => {
    it('should set CORS headers', () => {
      const headers = setCors({ origins: ['*'], methods: ['GET'] });
      expect(headers['access-control-allow-origin']).toBe('*');
      expect(headers['access-control-allow-methods']).toBe('GET');
    });
  });
});