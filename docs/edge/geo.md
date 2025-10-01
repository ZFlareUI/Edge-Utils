---
title: "Geographic Utilities"
description: "Location detection, nearest endpoint routing, and geographic optimizations for edge computing"
---

# Geographic Utilities

Edge-Utils provides powerful geographic utilities for location-aware applications, enabling intelligent routing, location detection, and geographic optimizations.

## Features

- **Location Detection**: Automatic user location detection
- **Nearest Endpoint Routing**: Route to closest endpoints
- **Geographic Load Balancing**: Distribute load based on geography
- **Distance Calculations**: Calculate distances between coordinates
- **Geocoding**: Convert addresses to coordinates
- **Region Optimization**: Optimize for regional performance

## Location Detection

Automatically detect user location from requests.

```js
import { LocationDetector, GeoUtils } from 'edge-utils';

const locationDetector = new LocationDetector();
const geoUtils = new GeoUtils();

export default {
  async fetch(request) {
    // Detect user location
    const location = await locationDetector.detect(request);

    console.log('User location:', {
      country: location.country,
      region: location.region,
      city: location.city,
      coordinates: location.coordinates,
      timezone: location.timezone
    });

    // Use location for personalization
    const localizedContent = await getLocalizedContent(location);

    return new Response(JSON.stringify({
      location,
      content: localizedContent
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### Advanced Location Detection

```js
const locationDetector = new LocationDetector({
  providers: [
    'cloudflare',  // Use Cloudflare's geolocation
    'ipapi',       // Fallback to IP-API
    'maxmind'      // Fallback to MaxMind
  ],
  cache: {
    ttl: 3600000,  // Cache for 1 hour
    maxSize: 10000
  },
  accuracy: 'city' // city, region, or country level
});

// Detect with multiple fallbacks
const location = await locationDetector.detect(request, {
  fallback: true,
  timeout: 5000
});

if (location.accuracy === 'city') {
  // High accuracy location available
  await provideCitySpecificContent(location);
} else if (location.accuracy === 'country') {
  // Country-level location
  await provideCountrySpecificContent(location);
}
```

## Nearest Endpoint Routing

Route requests to the nearest available endpoint.

```js
import { NearestEndpointRouter, EndpointManager } from 'edge-utils';

const endpoints = [
  { id: 'us-east', url: 'https://api-us-east.example.com', location: { lat: 39.0438, lng: -77.4874 } },
  { id: 'eu-west', url: 'https://api-eu-west.example.com', location: { lat: 53.3498, lng: -6.2603 } },
  { id: 'asia-pacific', url: 'https://api-asia.example.com', location: { lat: 35.6762, lng: 139.6503 } }
];

const endpointManager = new EndpointManager(endpoints);
const router = new NearestEndpointRouter(endpointManager);

export default {
  async fetch(request) {
    // Detect user location
    const userLocation = await locationDetector.detect(request);

    // Find nearest endpoint
    const nearestEndpoint = await router.findNearest(userLocation.coordinates);

    console.log(`Routing to nearest endpoint: ${nearestEndpoint.id}`);

    // Proxy request to nearest endpoint
    const response = await fetch(`${nearestEndpoint.url}${new URL(request.url).pathname}`, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    // Add routing information to response
    response.headers.set('X-Edge-Location', nearestEndpoint.id);
    response.headers.set('X-Response-Time', Date.now() - startTime);

    return response;
  }
};
```

### Advanced Routing

```js
const router = new NearestEndpointRouter(endpointManager, {
  algorithm: 'haversine', // haversine, vincenty, or spherical
  maxDistance: 5000,      // Maximum routing distance in km
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000
  },
  loadBalancing: {
    enabled: true,
    strategy: 'weighted-latency'
  }
});

// Route with health checking
const healthyEndpoint = await router.findNearestHealthy(userLocation.coordinates);

if (!healthyEndpoint) {
  // All endpoints unhealthy, use fallback
  return await handleFallback(request);
}

// Route with load balancing
const balancedEndpoint = await router.findNearestBalanced(userLocation.coordinates, {
  weights: {
    latency: 0.7,
    load: 0.3
  }
});
```

## Geographic Load Balancing

Distribute traffic based on geographic factors.

```js
import { GeoLoadBalancer, LoadBalancer } from 'edge-utils';

const geoBalancer = new GeoLoadBalancer({
  regions: {
    'us-east': {
      endpoints: ['us-east-1', 'us-east-2'],
      weight: 2,
      latency: 50
    },
    'eu-west': {
      endpoints: ['eu-west-1', 'eu-west-2'],
      weight: 1.5,
      latency: 80
    },
    'asia-pacific': {
      endpoints: ['ap-southeast-1'],
      weight: 1,
      latency: 200
    }
  },
  strategy: 'geographic-latency', // geographic-latency, round-robin, least-connections
  healthCheck: true
});

export default {
  async fetch(request) {
    const userLocation = await locationDetector.detect(request);

    // Get optimal endpoint based on geography
    const endpoint = await geoBalancer.selectEndpoint(userLocation);

    // Route request
    const response = await proxyToEndpoint(request, endpoint);

    // Update load balancer with response time
    geoBalancer.updateLatency(endpoint.id, response.headers.get('X-Response-Time'));

    return response;
  }
};
```

### Dynamic Load Balancing

```js
const geoBalancer = new GeoLoadBalancer({
  regions: regions,
  dynamicWeights: true,
  metrics: {
    collectLatency: true,
    collectErrors: true,
    updateInterval: 60000 // Update weights every minute
  }
});

// Monitor performance and adjust weights
geoBalancer.on('region-performance', (regionId, metrics) => {
  console.log(`Region ${regionId} performance:`, metrics);

  if (metrics.errorRate > 0.1) {
    // Reduce weight for high-error region
    geoBalancer.adjustWeight(regionId, 0.5);
  }

  if (metrics.avgLatency > 1000) {
    // Reduce weight for slow region
    geoBalancer.adjustWeight(regionId, 0.7);
  }
});
```

## Distance Calculations

Calculate distances between geographic coordinates.

```js
import { GeoUtils, DistanceCalculator } from 'edge-utils';

const geoUtils = new GeoUtils();
const distanceCalc = new DistanceCalculator();

// Calculate distance between two points
const distance = distanceCalc.haversine(
  { lat: 40.7128, lng: -74.0060 }, // New York
  { lat: 34.0522, lng: -118.2437 } // Los Angeles
);

console.log(`Distance: ${distance} km`);

// Find points within radius
const userLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco
const radius = 50; // 50km

const nearbyPoints = await geoUtils.findWithinRadius(userLocation, points, radius);

console.log(`Found ${nearbyPoints.length} points within ${radius}km`);
```

### Advanced Distance Calculations

```js
const distanceCalc = new DistanceCalculator({
  algorithm: 'vincenty', // vincenty, haversine, or spherical
  unit: 'km',            // km, miles, or nautical-miles
  precision: 6           // Decimal precision
});

// Calculate distances for multiple points
const distances = distanceCalc.batchCalculate(
  userLocation,
  [
    { lat: 37.7849, lng: -122.4094 }, // Point A
    { lat: 37.7649, lng: -122.4294 }, // Point B
    { lat: 37.7449, lng: -122.4494 }  // Point C
  ]
);

// Sort by distance
const sortedPoints = distances
  .map((distance, index) => ({ distance, point: points[index] }))
  .sort((a, b) => a.distance - b.distance);
```

## Geocoding

Convert addresses to geographic coordinates.

```js
import { Geocoder } from 'edge-utils';

const geocoder = new Geocoder({
  provider: 'openstreetmap', // openstreetmap, google, or mapbox
  apiKey: process.env.GEOCODING_API_KEY,
  cache: {
    ttl: 86400000, // Cache for 24 hours
    maxSize: 1000
  }
});

export default {
  async fetch(request) {
    const { address } = await request.json();

    try {
      // Geocode address
      const location = await geocoder.geocode(address);

      console.log('Geocoded location:', {
        address: location.formattedAddress,
        coordinates: location.coordinates,
        bounds: location.bounds,
        components: location.addressComponents
      });

      return new Response(JSON.stringify(location), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Geocoding failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

### Reverse Geocoding

```js
// Convert coordinates to address
const address = await geocoder.reverseGeocode({
  lat: 40.7128,
  lng: -74.0060
});

console.log('Reverse geocoded address:', {
  formatted: address.formattedAddress,
  components: address.addressComponents
});
```

## Region Optimization

Optimize applications for specific geographic regions.

```js
import { RegionOptimizer, ContentLocalizer } from 'edge-utils';

const regionOptimizer = new RegionOptimizer({
  regions: {
    'us': { timezone: 'America/New_York', currency: 'USD', language: 'en-US' },
    'eu': { timezone: 'Europe/London', currency: 'EUR', language: 'en-GB' },
    'asia': { timezone: 'Asia/Tokyo', currency: 'JPY', language: 'ja-JP' }
  }
});

const contentLocalizer = new ContentLocalizer({
  translations: {
    'en-US': { welcome: 'Welcome' },
    'es-ES': { welcome: 'Bienvenido' },
    'fr-FR': { welcome: 'Bienvenue' }
  }
});

export default {
  async fetch(request) {
    const location = await locationDetector.detect(request);

    // Optimize for region
    const regionConfig = regionOptimizer.getRegionConfig(location);

    // Localize content
    const localizedContent = await contentLocalizer.localize(
      { welcome: 'Welcome to our app' },
      regionConfig.language
    );

    // Apply regional optimizations
    const optimizedResponse = await regionOptimizer.optimizeResponse(
      localizedContent,
      regionConfig
    );

    return new Response(JSON.stringify(optimizedResponse), {
      headers: {
        'Content-Type': 'application/json',
        'X-Region': regionConfig.code,
        'X-Timezone': regionConfig.timezone
      }
    });
  }
};
```

## Geographic Caching

Cache content based on geographic location.

```js
import { GeoCache, CacheManager } from 'edge-utils';

const geoCache = new GeoCache({
  regions: ['us-east', 'eu-west', 'asia-pacific'],
  ttl: 3600000, // 1 hour
  strategy: 'region-based' // region-based, location-based, or distance-based
});

const cache = new CacheManager({
  backend: geoCache
});

export default {
  async fetch(request) {
    const location = await locationDetector.detect(request);

    // Cache key includes geographic context
    const cacheKey = geoCache.createGeoKey('content', location);

    // Try to get from cache
    let content = await cache.get(cacheKey);

    if (!content) {
      // Generate content
      content = await generateLocalizedContent(location);

      // Cache with geographic context
      await cache.set(cacheKey, content, {
        region: location.country,
        ttl: 3600000
      });
    }

    return new Response(JSON.stringify(content), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': content.cached ? 'HIT' : 'MISS'
      }
    });
  }
};
```

## Platform-Specific Geographic Features

### Cloudflare Workers

```js
import { LocationDetector } from 'edge-utils';

export default {
  async fetch(request) {
    // Use Cloudflare's geolocation data
    const cfLocation = {
      country: request.cf?.country,
      city: request.cf?.city,
      region: request.cf?.region,
      coordinates: {
        lat: request.cf?.latitude,
        lng: request.cf?.longitude
      },
      timezone: request.cf?.timezone,
      colo: request.cf?.colo
    };

    // Enhance with additional detection if needed
    const detector = new LocationDetector({ platform: 'cloudflare' });
    const enhancedLocation = await detector.enhance(cfLocation);

    // Use location for routing
    const nearestColo = await findNearestColo(enhancedLocation);

    return new Response(JSON.stringify({
      location: enhancedLocation,
      nearestColo
    }));
  }
};
```

### Vercel Edge Functions

```js
import { LocationDetector } from 'edge-utils';

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  // Vercel provides basic geolocation
  const vercelLocation = {
    country: request.geo?.country,
    region: request.geo?.region,
    city: request.geo?.city,
    coordinates: {
      lat: request.geo?.latitude,
      lng: request.geo?.longitude
    }
  };

  const detector = new LocationDetector({ platform: 'vercel' });
  const location = await detector.enhance(vercelLocation);

  // Route to nearest region
  const nearestRegion = await routeToNearestRegion(location);

  return new Response(JSON.stringify({
    location,
    nearestRegion
  }));
}
```

## Best Practices

### 1. Privacy Considerations

```js
// Respect user privacy preferences
const locationDetector = new LocationDetector({
  privacy: {
    requireConsent: true,
    gdprCompliant: true,
    dataRetention: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Check consent before location detection
if (await locationDetector.hasConsent(request)) {
  const location = await locationDetector.detect(request);
  // Use location data
} else {
  // Use default or region-based content
  const defaultContent = await getDefaultContent();
}
```

### 2. Fallback Strategies

```js
// Implement robust fallback strategies
const getLocationWithFallback = async (request) => {
  try {
    // Primary detection
    return await locationDetector.detect(request);
  } catch (error) {
    console.warn('Primary location detection failed:', error);

    try {
      // Fallback to IP-based detection
      return await locationDetector.detectByIP(request);
    } catch (fallbackError) {
      console.warn('Fallback detection failed:', fallbackError);

      // Use default location
      return {
        country: 'US',
        coordinates: { lat: 39.8283, lng: -98.5795 }, // Geographic center of US
        accuracy: 'country'
      };
    }
  }
};
```

### 3. Performance Optimization

```js
// Cache geographic calculations
const geoCache = new Map();

const cachedDistance = (point1, point2) => {
  const key = `${point1.lat},${point1.lng}-${point2.lat},${point2.lng}`;

  if (geoCache.has(key)) {
    return geoCache.get(key);
  }

  const distance = distanceCalc.haversine(point1, point2);
  geoCache.set(key, distance);

  return distance;
};
```

## API Reference

### LocationDetector

- `detect(request, options)` - Detect location from request
- `detectByIP(ip)` - Detect location from IP address
- `enhance(location)` - Enhance location data with additional info
- `hasConsent(request)` - Check if user has consented to location tracking

### NearestEndpointRouter

- `findNearest(coordinates)` - Find nearest endpoint
- `findNearestHealthy(coordinates)` - Find nearest healthy endpoint
- `findNearestBalanced(coordinates, options)` - Find nearest with load balancing

### GeoLoadBalancer

- `selectEndpoint(location)` - Select optimal endpoint for location
- `updateLatency(endpointId, latency)` - Update endpoint latency
- `adjustWeight(regionId, weight)` - Adjust region weight

### DistanceCalculator

- `haversine(point1, point2)` - Calculate haversine distance
- `vincenty(point1, point2)` - Calculate vincenty distance
- `batchCalculate(origin, points)` - Calculate distances to multiple points

### Geocoder

- `geocode(address)` - Convert address to coordinates
- `reverseGeocode(coordinates)` - Convert coordinates to address
- `batchGeocode(addresses)` - Geocode multiple addresses