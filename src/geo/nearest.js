/**
 * Nearest region selection utility
 * @module edge-utils/geo/nearest
 */
function nearestRegion(userRegion, availableRegions) {
  if (availableRegions.includes(userRegion)) {
    return userRegion;
  }
  // Simple fallback: return first available
  return availableRegions[0] || 'us';
}

function calculateDistance(region1, region2) {
  // Simplified distance calculation (in reality, use geo coordinates)
  const distances = {
    'us': { 'eu': 6000, 'asia': 11000 },
    'eu': { 'us': 6000, 'asia': 8000 },
    'asia': { 'us': 11000, 'eu': 8000 }
  };
  return distances[region1] && distances[region1][region2] ? distances[region1][region2] : 10000;
}

function nearestRegionByDistance(userRegion, availableRegions) {
  let nearest = availableRegions[0];
  let minDistance = calculateDistance(userRegion, nearest);
  for (const region of availableRegions) {
    const distance = calculateDistance(userRegion, region);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = region;
    }
  }
  return nearest;
}

module.exports = { nearestRegion, nearestRegionByDistance };