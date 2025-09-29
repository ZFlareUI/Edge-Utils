const { EdgeError, handleError, circuitBreaker } = require('../src/errors');

describe('Error Handling', () => {
  describe('EdgeError', () => {
    it('should create error with status', () => {
      const error = new EdgeError('Test error', 404);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
    });
  });

  describe('handleError', () => {
    it('should return error response', () => {
      const response = handleError(new Error('Test'));
      expect(response.status).toBe(500);
    });

    it('should handle fallback', () => {
      const response = handleError(new Error('Test'), { fallback: '/error' });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/error');
    });
  });

  describe('circuitBreaker', () => {
    it('should allow calls when closed', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const breaker = circuitBreaker(fn);
      const result = await breaker();
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should open after failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const breaker = circuitBreaker(fn, 2);
      await expect(breaker()).rejects.toThrow('fail');
      await expect(breaker()).rejects.toThrow('fail');
      await expect(breaker()).rejects.toThrow('Circuit breaker is open');
    });
  });
});