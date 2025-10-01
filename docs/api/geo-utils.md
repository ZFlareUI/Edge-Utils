---
title: "Geo Utils API"
description: "Complete API reference for geographic utilities"
---

# Geo Utils API Reference

The Geo Utils provide location detection, geographic calculations, and location-based routing.

## LocationDetector

Automatic user location detection.

### Constructor

```js
new LocationDetector(options)
```

**Parameters:**
- `options` (object): Location detection options

### Methods

#### detect(request)

Detect location from request.

```js
const location = await locationDetector.detect(request);
```

**Parameters:**
- `request` (Request): HTTP request

**Returns:** Promise resolving to location object

#### detectByIP(ip)

Detect location from IP address.

```js
const location = await locationDetector.detectByIP('192.168.1.1');
```

**Parameters:**
- `ip` (string): IP address

**Returns:** Promise resolving to location object

#### enhance(location)

Enhance location data.

```js
const enhanced = await locationDetector.enhance(location);
```

**Parameters:**
- `location` (object): Location object

**Returns:** Promise resolving to enhanced location

## DistanceCalculator

Geographic distance calculations.

### Constructor

```js
new DistanceCalculator(options)
```

**Parameters:**
- `options` (object): Distance calculation options

### Methods

#### haversine(point1, point2)

Calculate haversine distance.

```js
const distance = distanceCalc.haversine(
  { lat: 40.7128, lng: -74.0060 },
  { lat: 34.0522, lng: -118.2437 }
);
```

**Parameters:**
- `point1` (object): First point {lat, lng}
- `point2` (object): Second point {lat, lng}

**Returns:** Distance in kilometers

#### batchCalculate(origin, points)

Calculate distances to multiple points.

```js
const distances = distanceCalc.batchCalculate(origin, points);
```

**Parameters:**
- `origin` (object): Origin point
- `points` (array): Array of points

**Returns:** Array of distances

## NearestEndpointRouter

Route to nearest endpoints.

### Constructor

```js
new NearestEndpointRouter(endpointManager, options)
```

**Parameters:**
- `endpointManager` (EndpointManager): Endpoint manager
- `options` (object): Router options

### Methods

#### findNearest(coordinates)

Find nearest endpoint.

```js
const endpoint = await router.findNearest({ lat: 40.7128, lng: -74.0060 });
```

**Parameters:**
- `coordinates` (object): Geographic coordinates

**Returns:** Promise resolving to nearest endpoint

#### findNearestHealthy(coordinates)

Find nearest healthy endpoint.

```js
const endpoint = await router.findNearestHealthy(coordinates);
```

**Parameters:**
- `coordinates` (object): Geographic coordinates

**Returns:** Promise resolving to nearest healthy endpoint

## Geocoder

Address geocoding and reverse geocoding.

### Constructor

```js
new Geocoder(options)
```

**Parameters:**
- `options` (object): Geocoding options

### Methods

#### geocode(address)

Convert address to coordinates.

```js
const location = await geocoder.geocode('1600 Amphitheatre Parkway, Mountain View, CA');
```

**Parameters:**
- `address` (string): Address string

**Returns:** Promise resolving to location object

#### reverseGeocode(coordinates)

Convert coordinates to address.

```js
const address = await geocoder.reverseGeocode({ lat: 37.4419, lng: -122.1430 });
```

**Parameters:**
- `coordinates` (object): Geographic coordinates

**Returns:** Promise resolving to address object

## Type Definitions

### Location

```typescript
interface Location {
  country: string;
  region: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  accuracy: 'country' | 'region' | 'city';
}
```

### Endpoint

```typescript
interface Endpoint {
  id: string;
  url: string;
  location: {
    lat: number;
    lng: number;
  };
  health?: 'healthy' | 'unhealthy';
  latency?: number;
}
```

### GeocodeResult

```typescript
interface GeocodeResult {
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  addressComponents: AddressComponent[];
}
```