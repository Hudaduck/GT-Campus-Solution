import React, { useMemo } from 'react';
import { getCategoryIcon, getCategoryLabel } from '../../shared/ui/categoryIcons';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ScoredEventItem } from './types';
import { UserProfile } from '../../shared/contracts';
import { Sparkles, MapPin, Navigation, Star } from 'lucide-react';

interface MapContainerViewProps {
  heightClass?: string;
  events: ScoredEventItem[];
  currentUser: UserProfile;
  center: [number, number];
  zoom: number;
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
  const categorySvg = renderToStaticMarkup(
    React.createElement(CategoryIcon, { size: 18, color: '#B39051', strokeWidth: 2.25 })
  );
  const starSvg = renderToStaticMarkup(
    React.createElement(Star, { size: 9, color: '#051E39', fill: '#051E39', strokeWidth: 2 })
  );

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

// Controller component to smoothly re-center map to GT campus
const MapCenterController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '70px', marginRight: '10px' }}>
      <div className="leaflet-bar leaflet-control">
        <button
          type="button"
          onClick={() => map.flyTo(center, zoom, { duration: 0.8 })}
          className="w-8 h-8 bg-[#051E39] tp-on-navy text-tp-accent flex items-center justify-center hover:bg-tp-elevated transition rounded shadow border border-[#B39051]/50"
          title="Recenter on Georgia Tech"
          aria-label="Recenter on Georgia Tech"
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

        <MapCenterController center={center} zoom={zoom} />

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
