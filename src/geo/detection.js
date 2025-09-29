/**
 * Country/region detection from headers
 * @module edge-utils/geo/detection
 */
function getCountry(headers) {
  return (
    headers.get('cf-ipcountry') ||
    headers.get('x-vercel-ip-country') ||
    headers.get('x-geo-country') ||
    'unknown'
  );
}

function getRegion(headers) {
  const country = getCountry(headers);
  const regionMap = {
    'us': 'north-america',
    'ca': 'north-america',
    'gb': 'europe',
    'de': 'europe',
    'fr': 'europe',
    'jp': 'asia',
    'kr': 'asia',
    'sg': 'asia',
    'au': 'oceania'
  };
  return regionMap[country.toLowerCase()] || 'unknown';
}

module.exports = { getCountry, getRegion };
