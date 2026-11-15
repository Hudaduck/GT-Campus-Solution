import { LocationPreference, UserProfile } from './contracts';

// Location preference: where someone wants to meet (an area) + how far they'll go (radius).
// It filters the Map's events and the Connect 1-on-1 deck. People's locations are only ever
// approximate (neighborhood level, derived from their zone label) for privacy.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface LocationArea extends GeoPoint {
  id: string;
  label: string;
  group: 'Atlanta' | 'Alumni hubs';
}

export const LOCATION_AREAS: LocationArea[] = [
  { id: 'gt-campus', label: 'Georgia Tech Campus', group: 'Atlanta', lat: 33.7756, lng: -84.3963 },
  { id: 'tech-square', label: 'Tech Square', group: 'Atlanta', lat: 33.7765, lng: -84.3888 },
  { id: 'midtown', label: 'Midtown', group: 'Atlanta', lat: 33.7838, lng: -84.3836 },
  { id: 'piedmont-park', label: 'Piedmont Park', group: 'Atlanta', lat: 33.785, lng: -84.3735 },
  { id: 'west-midtown', label: 'West Midtown', group: 'Atlanta', lat: 33.7828, lng: -84.4075 },
  { id: 'downtown', label: 'Downtown Atlanta', group: 'Atlanta', lat: 33.755, lng: -84.39 },
  { id: 'old-fourth-ward', label: 'Old Fourth Ward', group: 'Atlanta', lat: 33.768, lng: -84.365 },
  { id: 'buckhead', label: 'Buckhead', group: 'Atlanta', lat: 33.84, lng: -84.38 },
  { id: 'decatur', label: 'Decatur', group: 'Atlanta', lat: 33.7748, lng: -84.2963 },
  { id: 'nyc', label: 'New York City', group: 'Alumni hubs', lat: 40.7411, lng: -73.9897 },
  { id: 'sf', label: 'San Francisco', group: 'Alumni hubs', lat: 37.7785, lng: -122.4056 },
];

export const CURRENT_LOCATION_ID = 'current';

// null = Anywhere (no distance limit)
export const RADIUS_OPTIONS: (number | null)[] = [0.5, 1, 2, 5, 10, 25, null];
export const DEFAULT_RADIUS_MILES = 5;

export const radiusLabel = (radius: number | null): string => (radius === null ? 'Anywhere' : `${radius} mi`);

export function areaPreference(areaId: string, radiusMiles: number | null): LocationPreference {
  const area = LOCATION_AREAS.find((a) => a.id === areaId) ?? LOCATION_AREAS[0];
  return { areaId: area.id, label: area.label, lat: area.lat, lng: area.lng, radiusMiles };
}

export const DEFAULT_LOCATION_PREFERENCE: LocationPreference = areaPreference('gt-campus', DEFAULT_RADIUS_MILES);

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// Validates a stored preference; anything malformed falls back to the default
export function resolveLocationPreference(raw: unknown): LocationPreference {
  if (!raw || typeof raw !== 'object') return DEFAULT_LOCATION_PREFERENCE;
  const r = raw as Partial<LocationPreference>;
  const radiusMiles = r.radiusMiles === null ? null : RADIUS_OPTIONS.includes(r.radiusMiles as number) ? (r.radiusMiles as number) : DEFAULT_RADIUS_MILES;
  if (r.areaId === CURRENT_LOCATION_ID && isFiniteNumber(r.lat) && isFiniteNumber(r.lng)) {
    return { areaId: CURRENT_LOCATION_ID, label: 'Current location', lat: r.lat, lng: r.lng, radiusMiles };
  }
  if (typeof r.areaId === 'string' && LOCATION_AREAS.some((a) => a.id === r.areaId)) {
    return areaPreference(r.areaId, radiusMiles);
  }
  return { ...DEFAULT_LOCATION_PREFERENCE, radiusMiles };
}

export const getLocationPreference = (user: Pick<UserProfile, 'locationPreference'>): LocationPreference =>
  resolveLocationPreference(user.locationPreference);

// Great-circle distance in miles (haversine)
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isWithinRadius(pref: LocationPreference, point: GeoPoint | null): boolean {
  if (pref.radiusMiles === null) return true;
  if (!point) return false;
  return distanceMiles(pref, point) <= pref.radiusMiles;
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return 'under 0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles).toLocaleString('en-US')} mi`;
}

// Approximate, neighborhood-level points for people (first keyword that appears in their zone wins)
const ZONE_KEYWORDS: [string, GeoPoint][] = [
  ['tech square', { lat: 33.7765, lng: -84.3888 }],
  ['scheller', { lat: 33.7766, lng: -84.3878 }],
  ['5th st', { lat: 33.7768, lng: -84.389 }],
  ['piedmont', { lat: 33.785, lng: -84.3735 }],
  ['colony square', { lat: 33.788, lng: -84.383 }],
  ['howell mill', { lat: 33.7828, lng: -84.4075 }],
  ['west midtown', { lat: 33.7828, lng: -84.4075 }],
  ['centennial', { lat: 33.7712, lng: -84.3905 }],
  ['north ave', { lat: 33.7712, lng: -84.3905 }],
  ['bobby dodd', { lat: 33.7725, lng: -84.3928 }],
  ['east campus', { lat: 33.7745, lng: -84.3925 }],
  ['west campus', { lat: 33.779, lng: -84.405 }],
  ['tech green', { lat: 33.7749, lng: -84.3964 }],
  ['central campus', { lat: 33.7749, lng: -84.3964 }],
  ['midtown', { lat: 33.7838, lng: -84.3836 }],
  ['downtown', { lat: 33.755, lng: -84.39 }],
  ['buckhead', { lat: 33.84, lng: -84.38 }],
  ['decatur', { lat: 33.7748, lng: -84.2963 }],
  ['nyc', { lat: 40.7411, lng: -73.9897 }],
  ['new york', { lat: 40.7411, lng: -73.9897 }],
  ['sf', { lat: 37.7785, lng: -122.4056 }],
  ['san francisco', { lat: 37.7785, lng: -122.4056 }],
];

const CITY_POINTS: Record<string, GeoPoint> = {
  atlanta: { lat: 33.7756, lng: -84.3963 },
  nyc: { lat: 40.7411, lng: -73.9897 },
  'new york': { lat: 40.7411, lng: -73.9897 },
  sf: { lat: 37.7785, lng: -122.4056 },
  'san francisco': { lat: 37.7785, lng: -122.4056 },
};

export function profileLocation(profile: Pick<UserProfile, 'neighborhoodZone' | 'currentCity'>): GeoPoint | null {
  const zone = (profile.neighborhoodZone || '').toLowerCase();
  const words = zone.split(/[^a-z0-9]+/);
  for (const [key, point] of ZONE_KEYWORDS) {
    const hit = key.includes(' ') ? zone.includes(key) : words.includes(key);
    if (hit) return point;
  }
  return CITY_POINTS[(profile.currentCity || '').trim().toLowerCase()] ?? null;
}

// "0.4 mi away" from the viewer's preferred area, or null when unknown
export function distanceFromPreference(pref: LocationPreference, point: GeoPoint | null): number | null {
  return point ? distanceMiles(pref, point) : null;
}
