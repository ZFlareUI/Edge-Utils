/**
 * Geo-based routing utilities
 * @module edge-utils/geo/routing
 */
function geoRoute(headers, regions) {
  const country = getCountry(headers);
  // Map countries to regions
  const regionMap = {
    'us': 'us',
    'ca': 'us',
    'gb': 'eu',
    'de': 'eu',
    'fr': 'eu',
    'jp': 'asia',
    'kr': 'asia',
    'sg': 'asia'
  };
  const mappedRegion = regionMap[country.toLowerCase()] || 'us';
  return regions.includes(mappedRegion) ? mappedRegion : regions[0];
}

function getCountry(headers) {
  return (
    headers.get('cf-ipcountry') ||
    headers.get('x-vercel-ip-country') ||
    headers.get('x-geo-country') ||
    'unknown'
  );
}

module.exports = { geoRoute, getCountry };