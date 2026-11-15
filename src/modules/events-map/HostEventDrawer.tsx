import React, { useEffect, useState } from 'react';
import { getCategoryIcon } from '../../shared/ui/categoryIcons';
import { X, Clock, Tag, Users, MapPinPlus, CalendarClock, CalendarPlus } from 'lucide-react';
import { EventCategory, EventItem, UserProfile } from '../../shared/contracts';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { Repository, formatHobbies } from '../../shared/data/repository';
import { formatStart } from './eventTime';

interface HostEventDrawerProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (newEvent: EventItem) => void;
}

// How long the pop-up runs once it starts
const DURATION_OPTIONS = [1, 2, 3, 4, 6];
const MAX_DAYS_AHEAD = 30;
const HOUR = 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Next full hour that's at least 30 minutes away
function defaultStart(now = new Date()): Date {
  const d = new Date(now.getTime() + 30 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function quickStarts(now = new Date()): { label: string; at: Date }[] {
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const options = [{ label: 'In 1 hour', at: defaultStart(now) }];
  if (now.getHours() < 18) options.push({ label: 'Tonight · 7 PM', at: at(0, 19) });
  options.push({ label: 'Tomorrow · 6 PM', at: at(1, 18) });
  return options;
}

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'coffee', label: 'Casual' },
  { id: 'startup', label: 'AI & Startups' },
  { id: 'tech', label: 'Tech & Code' },
  { id: 'sports', label: 'Sports' },
  { id: 'study', label: 'Study Cram' },
  { id: 'social', label: 'Social & Games' },
  { id: 'networking', label: 'Alumni & Mentorship' },
];

const CAMPUS_ZONE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Midtown • Tech Square': { lat: 33.7765, lng: -84.3888 },
  'Central Campus • Tech Green': { lat: 33.7749, lng: -84.3964 },
  'East Campus • Bobby Dodd': { lat: 33.7725, lng: -84.3928 },
  'West Campus • Howell Mill': { lat: 33.7828, lng: -84.4075 },
  'Midtown • Piedmont Park': { lat: 33.7850, lng: -84.3735 },
};

export const HostEventDrawer: React.FC<HostEventDrawerProps> = ({
  currentUser,
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('coffee');
  const [locationName, setLocationName] = useState('');
  const [neighborhoodZone, setNeighborhoodZone] = useState('Midtown • Tech Square');
  const [startDate, setStartDate] = useState(() => toDateInput(defaultStart()));
  const [startClock, setStartClock] = useState(() => toTimeInput(defaultStart()));
  const [durationHours, setDurationHours] = useState(2);
  const [maxAttendees, setMaxAttendees] = useState(12);
  const [tagsInput, setTagsInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Each time the form opens, suggest the next sensible start time
  useEffect(() => {
    if (isOpen) {
      const d = defaultStart();
      setStartDate(toDateInput(d));
      setStartClock(toTimeInput(d));
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startAt = new Date(`${startDate}T${startClock}`);
  const validStart = !Number.isNaN(startAt.getTime());
  const startPreview = validStart ? formatStart(startAt) : 'pick a time';
  const today = new Date();
  const maxDate = new Date(today.getTime() + MAX_DAYS_AHEAD * 24 * HOUR);

  const setStart = (d: Date) => {
    setStartDate(toDateInput(d));
    setStartClock(toTimeInput(d));
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an event title');
      return;
    }
    if (!locationName.trim()) {
      setErrorMsg('Please enter a campus location name');
      return;
    }

    const now = Date.now();
    if (!validStart) {
      setErrorMsg('Please pick a date and start time');
      return;
    }
    if (startAt.getTime() < now - 60 * 1000) {
      setErrorMsg('Pick a start time in the future');
      return;
    }
    if (startAt.getTime() > now + MAX_DAYS_AHEAD * 24 * HOUR) {
      setErrorMsg(`Pop-ups can be scheduled up to ${MAX_DAYS_AHEAD} days ahead`);
      return;
    }

    // Scheduled, not live: shows as upcoming, goes live at the start, leaves the map when it ends
    const startTime = startAt.toISOString();
    const endMs = startAt.getTime() + durationHours * HOUR;
    const endTime = new Date(endMs).toISOString();
    const expiresAt = endMs;
    const ttlHours = durationHours;

    const zoneCoords = CAMPUS_ZONE_COORDINATES[neighborhoodZone] || { lat: 33.7756, lng: -84.3963 };

    const parsedTags = formatHobbies(tagsInput.split(',').filter((t) => t.trim()));
    if (parsedTags.length === 0) {
      parsedTags.push(category);
    }

    const newEvent: EventItem = {
      id: `event_user_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim() || `Join fellow Yellow Jackets for ${title}!`,
      hostId: currentUser.id,
      hostName: currentUser.name,
      hostRole: currentUser.role,
      hostAvatarUrl: currentUser.avatarUrl,
      locationName: locationName.trim(),
      lat: zoneCoords.lat + (Math.random() - 0.5) * 0.003, // Slight jitter for unique pin position
      lng: zoneCoords.lng + (Math.random() - 0.5) * 0.003,
      neighborhoodZone,
      startTime,
      endTime,
      ttlHours,
      expiresAt,
      createdAt: now,
      category,
      maxAttendees,
      attendees: [currentUser.id], // Host auto-RSVP
      tags: parsedTags,
      isHostAlum: currentUser.role === 'alumni',
    };

    Repository.saveEvent(newEvent);
    onEventCreated(newEvent);
    onClose();
  };

  return (
    <div
      data-testid="host-event-drawer"
      className="tp-sheet-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Host a campus pop-up"
        className="tp-sheet md:max-w-xl bg-tp-surface border-t md:border border-[#B39051]/35 px-5 pt-2 pb-5 md:p-6 text-tp-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetDragHandle onClose={onClose} />

        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-tp-ink flex items-center gap-2">
              <MapPinPlus className="w-6 h-6 text-tp-accent" />
              <span>Schedule a Campus Pop-Up</span>
            </h2>
            <p className="text-xs text-tp-muted">
              Pick a time so Yellow Jackets can plan to come
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tp-subtle hover:text-tp-ink rounded-full bg-tp-elevated hover:bg-[#B39051]/15 border border-tp-line transition"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1">
              Event Title *
            </label>
            <input
              type="text"
              data-testid="event-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Peters Deck Rooftop Pickleball Open Play"
              className="w-full px-3.5 py-2.5 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-sm outline-none transition"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    category === cat.id
                      ? 'bg-[#051E39] tp-on-navy text-tp-accent border-[#B39051] shadow-sm'
                      : 'bg-tp-elevated text-tp-muted border-tp-line hover:border-[#B39051]/60'
                  }`}
                >
                  {React.createElement(getCategoryIcon(cat.id), { className: 'w-3.5 h-3.5' })}
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location & Neighborhood Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1">
                Location Name *
              </label>
              <input
                type="text"
                data-testid="event-location-input"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. CULC 3rd Floor"
                className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1">
                Campus Neighborhood Zone
              </label>
              <select
                data-testid="event-zone-select"
                value={neighborhoodZone}
                onChange={(e) => setNeighborhoodZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-sm outline-none"
              >
                {Object.keys(CAMPUS_ZONE_COORDINATES).map((zone) => (
                  <option key={zone} value={zone} className="bg-tp-surface">
                    {zone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1">
              Description
            </label>
            <textarea
              data-testid="event-description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the plan? Bring paddles / laptops / good vibes..."
              className="w-full px-3.5 py-2 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-sm outline-none resize-none"
            />
          </div>

          {/* When: scheduled date + start time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-tp-muted flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-tp-accent" />
                <span>When? *</span>
              </label>
              <span data-testid="event-start-preview" className="text-[11px] text-tp-accent font-bold">
                {validStart ? `Starts ${startPreview}` : 'Pick a time'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickStarts().map((q) => (
                <button
                  type="button"
                  key={q.label}
                  onClick={() => setStart(q.at)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    validStart && Math.abs(q.at.getTime() - startAt.getTime()) < 60 * 1000
                      ? 'bg-[#B39051] text-[#051E39] border-[#B39051]'
                      : 'bg-tp-elevated text-tp-muted border-tp-line hover:border-[#B39051]/60'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label="Date"
                data-testid="event-date-input"
                value={startDate}
                min={toDateInput(today)}
                max={toDateInput(maxDate)}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-sm outline-none [color-scheme:dark]"
                required
              />
              <input
                type="time"
                aria-label="Start time"
                data-testid="event-time-input"
                value={startClock}
                step={900}
                onChange={(e) => {
                  setStartClock(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-sm outline-none [color-scheme:dark]"
                required
              />
            </div>
          </div>

          {/* How long it runs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tp-muted flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-tp-accent" />
              <span>How long will it run?</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {DURATION_OPTIONS.map((h) => (
                <button
                  type="button"
                  key={h}
                  data-testid={`duration-option-${h}`}
                  aria-pressed={durationHours === h}
                  onClick={() => setDurationHours(h)}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-bold border transition ${
                    durationHours === h
                      ? 'bg-[#B39051] text-[#051E39] border-[#B39051] shadow-md'
                      : 'bg-tp-elevated text-tp-muted border-tp-line hover:border-[#B39051]/60'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <p className="text-[11px] text-tp-subtle mt-1">
              It shows on the map as upcoming, goes live at the start time, and disappears when it ends.
            </p>
          </div>

          {/* Max Attendees & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-tp-accent" />
                <span>Max Attendees ({maxAttendees})</span>
              </label>
              <input
                type="range"
                min={2}
                max={30}
                step={1}
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(Number(e.target.value))}
                className="w-full accent-[#B39051] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tp-muted mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-tp-accent" />
                <span>Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                data-testid="event-tags-input"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. AI Startups, Pour-Over Coffee"
                className="w-full px-3 py-1.5 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-xs outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              data-testid="publish-event-button"
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] border-2 border-[#B39051] shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Schedule Pop-Up{validStart ? ` · ${startPreview}` : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
