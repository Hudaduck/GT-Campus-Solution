import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LocateFixed, MapPin, X } from 'lucide-react';
import { LocationPreference } from '../contracts';
import {
  CURRENT_LOCATION_ID,
  LOCATION_AREAS,
  RADIUS_OPTIONS,
  areaPreference,
  radiusLabel,
} from '../location';
import { SheetDragHandle } from './SheetDragHandle';

interface EditorProps {
  value: LocationPreference;
  onChange: (next: LocationPreference) => void;
}

const GROUPS = ['Atlanta', 'Alumni hubs'] as const;

/** Area (preset or current location) + radius. Used inline in My Profile and inside the chip sheet. */
export const LocationPreferenceEditor: React.FC<EditorProps> = ({ value, onChange }) => {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const useCurrentLocation = () => {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError("Your browser can't share its location. Pick an area instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          areaId: CURRENT_LOCATION_ID,
          label: 'Current location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusMiles: value.radiusMiles,
        });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location (permission denied or unavailable). Pick an area instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  };

  return (
    <div className="space-y-3" data-testid="location-editor">
      <div className="space-y-1.5">
        <label htmlFor="location-area" className="text-[11px] font-semibold text-tp-muted block">
          Area
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative flex items-center rounded-xl border border-[#B39051]/35 bg-tp-canvas focus-within:border-[#B39051]">
            <MapPin aria-hidden="true" className="absolute left-3 w-3.5 h-3.5 text-tp-accent pointer-events-none" />
            <select
              id="location-area"
              data-testid="location-area"
              value={value.areaId}
              onChange={(e) => onChange(areaPreference(e.target.value, value.radiusMiles))}
              className="appearance-none w-full bg-transparent pl-8 pr-8 py-2 text-xs font-semibold text-tp-ink outline-none cursor-pointer [&>option]:bg-tp-surface [&>optgroup]:bg-tp-surface"
            >
              {value.areaId === CURRENT_LOCATION_ID && <option value={CURRENT_LOCATION_ID}>Current location</option>}
              {GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {LOCATION_AREAS.filter((a) => a.group === group).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="absolute right-2.5 w-4 h-4 text-tp-muted pointer-events-none" />
          </div>
          <button
            type="button"
            data-testid="location-use-current"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-xl border border-[#B39051]/60 text-tp-accent text-xs font-semibold hover:bg-tp-elevated transition disabled:opacity-60"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        {geoError && (
          <p role="alert" className="text-[11px] text-red-400">
            {geoError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-tp-muted" id="location-radius-label">
          How far will you go?
        </p>
        <div role="group" aria-labelledby="location-radius-label" className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((r) => {
            const selected = value.radiusMiles === r;
            return (
              <button
                key={String(r)}
                type="button"
                data-testid={`radius-${r === null ? 'anywhere' : r}`}
                aria-pressed={selected}
                onClick={() => onChange({ ...value, radiusMiles: r })}
                className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold border transition ${
                  selected
                    ? 'bg-[#B39051] text-[#051E39] border-[#B39051]'
                    : 'bg-tp-canvas/60 text-tp-muted border-tp-line hover:border-[#B39051]/60 hover:text-tp-ink'
                }`}
              >
                {radiusLabel(r)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ChipProps extends EditorProps {
  className?: string;
}

/** Compact "📍 Tech Square · 5 mi" control that opens the editor in a sheet; changes apply immediately. */
export const LocationPreferenceChip: React.FC<ChipProps> = ({ value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid="location-chip"
        onClick={() => setOpen(true)}
        title="Change your area and radius"
        className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl border border-[#B39051]/60 bg-tp-surface text-xs font-semibold text-tp-ink hover:bg-tp-elevated transition max-w-full ${className}`}
      >
        <MapPin className="w-3.5 h-3.5 text-tp-accent shrink-0" />
        <span className="truncate">{value.label}</span>
        <span className="text-tp-accent shrink-0">· {radiusLabel(value.radiusMiles)}</span>
        <ChevronDown className="w-3.5 h-3.5 text-tp-muted shrink-0" />
      </button>

      {/* Portaled to <body> so it sits above the map and tab bar, whatever container the chip is in */}
      {open &&
        createPortal(
        <div className="tp-sheet-backdrop" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Location preference"
            data-testid="location-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
            className="tp-sheet md:max-w-md bg-tp-surface border-t md:border border-[#B39051]/35 p-5 pt-2 space-y-4"
          >
            <SheetDragHandle onClose={() => setOpen(false)} />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-tp-ink">Location preference</h3>
                <p className="text-[11px] text-tp-muted">Sets the events on your map and the people in Connect 1-on-1.</p>
              </div>
              <button
                type="button"
                aria-label="Close location preference"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-tp-subtle hover:text-tp-ink hover:bg-tp-ink/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <LocationPreferenceEditor value={value} onChange={onChange} />
            <button
              type="button"
              data-testid="location-done"
              onClick={() => setOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#B39051] text-[#051E39] text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#8F713D] transition"
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          </div>
        </div>,
          document.body
        )}
    </>
  );
};
