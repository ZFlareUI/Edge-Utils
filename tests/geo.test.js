const { geoRoute, getCountry } = require('../src/geo/routing');

describe('Geo Routing', () => {
  describe('getCountry', () => {
    it('should get country from cf-ipcountry header', () => {
      const headers = new Map([['cf-ipcountry', 'US']]);
      expect(getCountry(headers)).toBe('US');
    });

    it('should fallback to unknown', () => {
      const headers = new Map();
      expect(getCountry(headers)).toBe('unknown');
    });
  });

  describe('geoRoute', () => {
    it('should route based on country', () => {
      const headers = new Map([['cf-ipcountry', 'US']]);
      const regions = ['us', 'eu'];
      expect(geoRoute(headers, regions)).toBe('us');
    });
  });
});