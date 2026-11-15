import React, { useCallback, useEffect, useMemo } from 'react';
import { getCategoryIcon, getCategoryLabel } from '../../shared/ui/categoryIcons';
import { iconToSvgMarkup } from '../../shared/ui/iconMarkup';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ScoredEventItem } from './types';
import { UserProfile } from '../../shared/contracts';
import { radiusLabel } from '../../shared/location';
import { Sparkles, MapPin, Navigation, Star } from 'lucide-react';

interface MapContainerViewProps {
  heightClass?: string;
  events: ScoredEventItem[];
  currentUser: UserProfile;
  center: [number, number];
  zoom: number;
  radiusMiles?: number | null; // draws the location-preference radius and fits the view to it
  onTileError: () => void;
  onSelectEvent: (event: ScoredEventItem) => void;
}

// High-contrast Navy (#051E39) pins with Gold (#B39051) / Dark Gold (#8F713D) rings
export function createGTMarkerIcon(event: ScoredEventItem): L.DivIcon {
  const isRec = event.isRecommended;
  const isAlum = event.isHostAlum;

  const borderColor = isRec ? '#B39051' : '#8F713D';
  const borderWidth = isRec ? '3px' : '2px';
  const shadow = isRec
    ? 'box-shadow: 0 0 14px #B39051, 0 4px 10px rgba(0,0,0,0.5);'
    : 'box-shadow: 0 3px 6px rgba(0,0,0,0.4);';

  const CategoryIcon = getCategoryIcon(event.category);
  const categorySvg = iconToSvgMarkup(CategoryIcon, { size: 18, color: '#B39051', strokeWidth: 2.25 });
  const starSvg = iconToSvgMarkup(Star, { size: 9, color: '#051E39', fill: '#051E39', strokeWidth: 2 });

  const starBadge = isRec
    ? `<span style="position:absolute;top:-6px;right:-6px;background:#B39051;color:#051E39;border-radius:9999px;font-size:10px;font-weight:900;padding:2px 3px;display:flex;border:1.5px solid #051E39;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${starSvg}</span>`
    : '';

  const alumBadge = isAlum
    ? `<span style="position:absolute;bottom:-4px;right:-4px;background:#051E39;color:#B39051;border-radius:9999px;font-size:8px;font-weight:800;padding:0 3px;border:1px solid #B39051;">GT</span>`
    : '';

  const html = `
    <div style="position:relative;width:42px;height:42px;border-radius:50%;background:#051E39;border:${borderWidth} solid ${borderColor};${shadow}display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;transition:transform 0.15s ease;">
      <span data-category="${event.category}" style="display:flex;line-height:0;">${categorySvg}</span>
      ${starBadge}
      ${alumBadge}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'gt-custom-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });
}

const METERS_PER_MILE = 1609.34;
const MILES_PER_DEGREE_LAT = 69.05;

// "5 mi" tag pinned to the top of the radius ring, readable at any zoom
const radiusLabelPosition = ([lat, lng]: [number, number], radiusMiles: number): [number, number] => [
  lat + radiusMiles / MILES_PER_DEGREE_LAT,
  lng,
];
const radiusLabelIcon = (radiusMiles: number) =>
  L.divIcon({
    className: 'tp-radius-label',
    html: `<span style="display:inline-block;transform:translate(-50%,-50%);white-space:nowrap;padding:2px 8px;border-radius:9999px;background:#051E39;color:#B39051;border:1.5px solid #B39051;font:800 11px/1.4 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.35);">${radiusLabel(radiusMiles)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

// Keeps the view on the location preference: fits the radius circle (or centers for "Anywhere")
// whenever the area or radius changes, plus a button to snap back to it.
const MapViewController: React.FC<{ center: [number, number]; zoom: number; radiusMiles: number | null }> = ({
  center,
  zoom,
  radiusMiles,
}) => {
  const map = useMap();
  const [lat, lng] = center;

  const fitToPreference = useCallback(
    (animate: boolean) => {
      try {
        const size = map.getSize();
        if (radiusMiles !== null && size.x > 0 && size.y > 0) {
          const bounds = L.latLng(lat, lng).toBounds(radiusMiles * METERS_PER_MILE * 2);
          // Fractional zoom (zoomSnap below) lets the circle fill the view instead of rounding out a level
          map.fitBounds(bounds, { padding: [6, 6], animate });
        } else {
          map.setView([lat, lng], zoom, { animate });
        }
      } catch {
        // Headless / zero-size containers can't compute bounds; the initial center still applies
      }
    },
    [map, lat, lng, zoom, radiusMiles]
  );

  useEffect(() => fitToPreference(false), [fitToPreference]);

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '70px', marginRight: '10px' }}>
      <div className="leaflet-bar leaflet-control">
        <button
          type="button"
          onClick={() => fitToPreference(true)}
          className="w-8 h-8 bg-[#051E39] tp-on-navy text-tp-accent flex items-center justify-center hover:bg-tp-elevated transition rounded shadow border border-[#B39051]/50"
          title="Recenter on your area"
          aria-label="Recenter on your area"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const MapContainerView: React.FC<MapContainerViewProps> = ({
  heightClass = 'h-[550px] sm:h-[650px]',
  events,
  currentUser,
  center,
  zoom,
  radiusMiles = null,
  onTileError,
  onSelectEvent,
}) => {
  // Pre-generate icons for each event
  const eventIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    events.forEach((ev) => {
      try {
        map.set(ev.id, createGTMarkerIcon(ev));
      } catch {
        // Fallback in case of headless issues
      }
    });
    return map;
  }, [events]);

  return (
    <div className={`relative w-full ${heightClass} rounded-3xl overflow-hidden border border-[#B39051]/35 shadow-2xl z-0`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#051E39' }}
        scrollWheelZoom={true}
        zoomSnap={0.1}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{
            tileerror: () => {
              onTileError();
            },
          }}
        />

        <MapViewController center={center} zoom={zoom} radiusMiles={radiusMiles} />

        {/* Location preference, split across layers so it reads at any zoom:
            - tinted fill + center dot BELOW the event markers (default overlay pane), so they stay clean
            - ring outline ABOVE the markers: they're a fixed size and would bury it when zoomed out
            - "5 mi" label above the ring
            The upper panes ignore pointer events, so markers underneath stay clickable. */}
        {radiusMiles !== null && (
          <Circle
            center={center}
            radius={radiusMiles * METERS_PER_MILE}
            interactive={false}
            pathOptions={{ stroke: false, fillColor: '#B39051', fillOpacity: 0.1 }}
          />
        )}
        <CircleMarker
          center={center}
          radius={6}
          interactive={false}
          pathOptions={{ color: '#051E39', weight: 2, fillColor: '#B39051', fillOpacity: 1 }}
        />
        {radiusMiles !== null && (
          <>
            <Pane name="radius-ring" style={{ zIndex: 650, pointerEvents: 'none' }}>
              <Circle
                center={center}
                radius={radiusMiles * METERS_PER_MILE}
                interactive={false}
                pathOptions={{ color: '#B39051', weight: 3, opacity: 0.95, dashArray: '8 6', fill: false }}
              />
            </Pane>
            <Pane name="radius-label" style={{ zIndex: 660, pointerEvents: 'none' }}>
              <Marker
                position={radiusLabelPosition(center, radiusMiles)}
                icon={radiusLabelIcon(radiusMiles)}
                interactive={false}
                keyboard={false}
              />
            </Pane>
          </>
        )}

        {events.map((event) => {
          const icon = eventIcons.get(event.id);
          const spotsLeft = Math.max(0, event.maxAttendees - event.attendees.length);
          const isAttending = event.attendees.includes(currentUser.id);

          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectEvent(event),
              }}
            >
              <Popup className="gt-map-popup">
                <div className="tp-on-light p-1 text-[#051E39] max-w-[200px]">
                  {event.isRecommended && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-[#051E39] bg-[#B39051] px-1.5 py-0.5 rounded mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{event.score} PTS BUZZ MATCH</span>
                    </div>
                  )}
                  <h4 className="font-black text-xs leading-tight mb-1 text-[#051E39]">
                    {event.title}
                  </h4>
                  <p className="text-[11px] text-tp-subtle mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#051E39]" />
                    <span className="truncate">{event.locationName}</span>
                  </p>
                  <div className="flex items-center justify-between text-[10px] mb-2 font-semibold">
                    <span className="text-emerald-700">
                      {isAttending ? 'Attending' : `${spotsLeft} spots left`}
                    </span>
                    <span className="text-tp-subtle">{getCategoryLabel(event.category)}</span>
                  </div>
                  <button
                    onClick={() => onSelectEvent(event)}
                    className="w-full py-1 px-2 rounded-lg bg-[#051E39] tp-on-navy text-tp-accent font-bold text-[10px] hover:bg-tp-elevated transition"
                  >
                    View & RSVP
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
