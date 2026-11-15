import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCATION_PREFERENCE,
  areaPreference,
  distanceMiles,
  formatDistance,
  isWithinRadius,
  profileLocation,
  resolveLocationPreference,
} from './location';
import { INITIAL_PROFILES } from './data/repository';

const byId = (id: string) => INITIAL_PROFILES.find((p) => p.id === id)!;

describe('location preference', () => {
  it('defaults to Georgia Tech Campus within 5 mi', () => {
    expect(DEFAULT_LOCATION_PREFERENCE).toMatchObject({ areaId: 'gt-campus', radiusMiles: 5 });
    expect(resolveLocationPreference(undefined)).toEqual(DEFAULT_LOCATION_PREFERENCE);
  });

  it('validates stored preferences and falls back safely', () => {
    expect(resolveLocationPreference({ areaId: 'sf', radiusMiles: 10 })).toMatchObject({ label: 'San Francisco', radiusMiles: 10 });
    expect(resolveLocationPreference({ areaId: 'nope', radiusMiles: 2 })).toMatchObject({ areaId: 'gt-campus', radiusMiles: 2 });
    expect(resolveLocationPreference({ areaId: 'midtown', radiusMiles: 3.7 }).radiusMiles).toBe(5); // not an option
    expect(resolveLocationPreference({ areaId: 'midtown', radiusMiles: null }).radiusMiles).toBeNull();
    expect(resolveLocationPreference({ areaId: 'current', lat: 33.8, lng: -84.4, radiusMiles: 1 })).toMatchObject({
      areaId: 'current',
      label: 'Current location',
      lat: 33.8,
    });
    expect(resolveLocationPreference({ areaId: 'current', lat: 'x', radiusMiles: 1 }).areaId).toBe('gt-campus');
  });

  it('computes great-circle distances in miles', () => {
    const atl = areaPreference('gt-campus', 5);
    const nyc = areaPreference('nyc', 5);
    expect(distanceMiles(atl, atl)).toBe(0);
    expect(distanceMiles(atl, nyc)).toBeGreaterThan(700);
    expect(distanceMiles(atl, nyc)).toBeLessThan(800);
  });

  it('treats a null radius as Anywhere and unknown locations as out of range', () => {
    const pref = areaPreference('gt-campus', 1);
    expect(isWithinRadius(pref, { lat: 33.7765, lng: -84.3888 })).toBe(true); // Tech Square
    expect(isWithinRadius(pref, { lat: 33.84, lng: -84.38 })).toBe(false); // Buckhead
    expect(isWithinRadius(pref, null)).toBe(false);
    expect(isWithinRadius({ ...pref, radiusMiles: null }, null)).toBe(true);
  });

  it('places people at their neighborhood (approximate), including alumni hubs', () => {
    expect(profileLocation(byId('user_alex_chen'))).toEqual({ lat: 33.7765, lng: -84.3888 }); // Tech Square
    expect(distanceMiles(areaPreference('sf', 1), profileLocation(byId('user_elena_rostova'))!)).toBeLessThan(1);
    expect(distanceMiles(areaPreference('nyc', 1), profileLocation(byId('user_david_park'))!)).toBeLessThan(1);
    expect(profileLocation({ neighborhoodZone: 'Somewhere new', currentCity: 'Atlanta' })).toEqual({ lat: 33.7756, lng: -84.3963 });
    expect(profileLocation({ neighborhoodZone: '', currentCity: 'Tokyo' })).toBeNull();
  });

  it('formats distances for display', () => {
    expect(formatDistance(0.05)).toBe('under 0.1 mi');
    expect(formatDistance(0.43)).toBe('0.4 mi');
    expect(formatDistance(2135.4)).toBe('2,135 mi');
  });
});
