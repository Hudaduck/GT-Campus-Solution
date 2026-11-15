import type { EventItem } from './contracts';

/** Google Maps directions to a place (an address, a place name or "lat,lng"); works on web and phones */
export function directionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Where to send people for a pop-up. Built-in pop-ups have exact coordinates. User-hosted ones
 * only have a neighborhood-level pin, so use the host's address, else the place name in Atlanta.
 */
export function eventDestination(event: Pick<EventItem, 'id' | 'lat' | 'lng' | 'locationName' | 'address'>): string {
  const address = event.address?.trim();
  if (address) return address;
  if (event.id.startsWith('event_user_')) return `${event.locationName}, Atlanta, GA`;
  return `${event.lat},${event.lng}`;
}

export const eventDirectionsUrl = (event: Parameters<typeof eventDestination>[0]): string =>
  directionsUrl(eventDestination(event));
