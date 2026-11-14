import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCategoryIcon } from '../../shared/ui/categoryIcons';
import {
  List as ListIcon,
  LayoutGrid,
  Map as MapIcon,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useBrand } from '../../shared/config/brandConfig';
import { UserProfile, EventItem } from '../../shared/contracts';
import {
  Repository,
  getEventScoreDetails,
  USER_CHANGED_EVENT,
  RECOMMENDED_SCORE_THRESHOLD,
  RECOMMENDED_MAX_COUNT,
} from '../../shared/data/repository';
import { LayoutMode } from '../../shared/ui/layout';
import { ScoredEventItem, ViewMode } from './types';
import { MapContainerView } from './MapContainerView';
import { EventListView } from './EventListView';
import { EventDetailDrawer } from './EventDetailDrawer';
import { HostEventDrawer } from './HostEventDrawer';

interface EventsMapViewProps {
  layout?: LayoutMode;
}

export const EventsMapView: React.FC<EventsMapViewProps> = ({ layout = 'phone' }) => {
  const { brand } = useBrand();
  const isWeb = layout === 'web';

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => Repository.getCurrentUser());
  const [events, setEvents] = useState<EventItem[]>(() => Repository.getEvents());
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [hasTileError, setHasTileError] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyRecommended, setOnlyRecommended] = useState<boolean>(false);

  // Drawers state
  const [selectedEvent, setSelectedEvent] = useState<ScoredEventItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isHostOpen, setIsHostOpen] = useState(false);

  // Refresh user and events periodically or on storage event
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(() => Repository.getProfiles());

  const refreshData = useCallback(() => {
    setCurrentUser(Repository.getCurrentUser());
    setEvents(Repository.getEvents());
    setAllProfiles(Repository.getProfiles());
  }, []);

  useEffect(() => {
    const handleChange = () => refreshData();
    window.addEventListener('storage', handleChange);
    window.addEventListener(USER_CHANGED_EVENT, handleChange);
    return () => {
      window.removeEventListener('storage', handleChange);
      window.removeEventListener(USER_CHANGED_EVENT, handleChange);
    };
  }, [refreshData]);

  // Score every event (hobbies + who is going), then flag the top matches as "Recommended For You"
  const scoredEvents: ScoredEventItem[] = useMemo(() => {
    const scored = events.map((ev): ScoredEventItem => {
      const details = getEventScoreDetails(ev, currentUser, allProfiles);
      const sharedHobbies = ev.tags.filter((tag) =>
        currentUser.hobbies.some((h) => h.toLowerCase() === tag.toLowerCase())
      );
      return {
        ...ev,
        score: details.score,
        isRecommended: false,
        sharedHobbies,
        matchReasons: details.matchReasons,
        attendeeHighlightText: details.attendeeHighlightText,
        overlappingAttendees: details.overlappingAttendees,
      };
    });

    [...scored]
      .sort((a, b) => b.score - a.score)
      .filter((ev) => ev.score >= RECOMMENDED_SCORE_THRESHOLD)
      .slice(0, RECOMMENDED_MAX_COUNT)
      .forEach((ev, i) => {
        ev.isRecommended = true;
        ev.recommendedRank = i + 1;
      });

    return scored;
  }, [events, currentUser, allProfiles]);

  // Filter and sort scored events
  const filteredEvents = useMemo(() => {
    return scoredEvents
      .filter((ev) => {
        // Category filter
        if (selectedCategory !== 'all' && ev.category !== selectedCategory) {
          return false;
        }
        // Recommended filter
        if (onlyRecommended && !ev.isRecommended) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = ev.title.toLowerCase().includes(q);
          const matchesLoc = ev.locationName.toLowerCase().includes(q);
          const matchesDesc = ev.description.toLowerCase().includes(q);
          const matchesTag = ev.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesLoc && !matchesDesc && !matchesTag) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.score - a.score); // Default to highest affinity first
  }, [scoredEvents, selectedCategory, onlyRecommended, searchQuery]);

  // Tile error handler: notify and provide smooth fallback
  const handleTileError = useCallback(() => {
    if (!hasTileError) {
      setHasTileError(true);
      // Auto-switch to list view to preserve continuous UX
      setViewMode('list');
    }
  }, [hasTileError]);

  const handleSelectEvent = (event: ScoredEventItem) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const handleRsvpSuccess = (updatedEvent: ScoredEventItem) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? { ...e, attendees: updatedEvent.attendees } : e))
    );
    if (selectedEvent && selectedEvent.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  };

  const handleEventCreated = (newEvent: EventItem) => {
    setEvents((prev) => [newEvent, ...prev]);
    // Switch to list view or map view centered on new event
    setSelectedCategory('all');
    setOnlyRecommended(false);
  };

  const recommendedEvents = filteredEvents.filter((ev) => ev.isRecommended);
  const otherEvents = filteredEvents.filter((ev) => !ev.isRecommended);

  const recommendedSection = (
    <section data-testid="recommended-for-you">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black text-tp-ink flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-tp-accent" />
          <span>Recommended For You</span>
        </h3>
        <span className="text-[11px] text-tp-subtle">Hobbies + who's going</span>
      </div>
      {recommendedEvents.length > 0 ? (
        <EventListView
          events={recommendedEvents}
          currentUser={currentUser}
          viewMode="list"
          onSelectEvent={handleSelectEvent}
          onRsvpSuccess={handleRsvpSuccess}
        />
      ) : (
        <p className="p-4 rounded-2xl bg-tp-surface border border-[#B39051]/35 text-xs text-tp-subtle">
          Add hobbies and target companies in My Profile to unlock personalized picks.
        </p>
      )}
    </section>
  );

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Events' },
    { id: 'coffee', label: 'Coffee' },
    { id: 'startup', label: 'Startups & AI' },
    { id: 'sports', label: 'Sports & Climb' },
    { id: 'study', label: 'Study Cram' },
    { id: 'social', label: 'Social & Games' },
    { id: 'networking', label: 'Networking' },
  ];

  const mapCenter: [number, number] = [brand.defaultCenter.lat, brand.defaultCenter.lng];
  const mapZoom = brand.defaultCenter.zoom;

  return (
    <div data-testid="events-map-view" className={`w-full mx-auto ${isWeb ? 'max-w-[1400px] px-6 py-5' : 'px-3 py-4'}`}>
      {/* Top Header & Action Controls */}
      <div className={`flex justify-between gap-3 mb-4 ${isWeb ? 'flex-row items-center' : 'flex-col'}`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-tp-ink tracking-tight flex items-center gap-2">
              <MapIcon className="w-6 h-6 text-tp-accent" />
              <span>Campus Map Radar</span>
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/35">
              {filteredEvents.length} Active Events
            </span>
          </div>
          {isWeb && (
            <p className="text-xs text-tp-muted">
              Real-time ephemeral student & alumni gatherings across Georgia Tech / Midtown Atlanta
            </p>
          )}
        </div>

        {/* View Switchers & Host Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-tp-surface p-1 rounded-2xl border border-[#B39051]/35 flex items-center shadow-inner">
            <button
              data-testid="view-toggle-map"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/40 shadow'
                  : 'text-tp-subtle hover:text-tp-ink'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              data-testid="view-toggle-list"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/40 shadow'
                  : 'text-tp-subtle hover:text-tp-ink'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              data-testid="view-toggle-grid"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'grid'
                  ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/40 shadow'
                  : 'text-tp-subtle hover:text-tp-ink'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          <button
            data-testid="open-host-event-button"
            onClick={() => setIsHostOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] border-2 border-[#B39051] shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#051E39]" />
            <span>Host Pop-Up</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-tp-surface p-3 rounded-2xl border border-[#B39051]/35 mb-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-tp-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="events-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, location, or tag (e.g., CULC, AI Startups)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-tp-elevated border border-tp-line focus:border-[#B39051] text-tp-ink text-xs outline-none"
            />
          </div>

          {/* Recommended Filter Pill */}
          <button
            data-testid="filter-recommended"
            onClick={() => setOnlyRecommended(!onlyRecommended)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition ${
              onlyRecommended
                ? 'bg-[#B39051] text-[#051E39] border-[#B39051] shadow'
                : 'bg-tp-elevated text-tp-accent border-[#B39051]/50 hover:bg-[#B39051]/15'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended for You</span>
          </button>
        </div>

        {/* Category Horizontal Scrolling Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                selectedCategory === cat.id
                  ? 'bg-[#051E39] tp-on-navy text-tp-accent border-[#B39051] shadow-sm font-bold'
                  : 'bg-tp-elevated/80 text-tp-muted border-tp-line/80 hover:border-[#B39051]/60'
              }`}
            >
              {React.createElement(getCategoryIcon(cat.id), { className: 'w-3.5 h-3.5' })}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Map or Fallback List/Grid */}
      {viewMode === 'map' ? (
        isWeb ? (
          // Web: split-screen map + ranked recommendations
          <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">
            <div className="sticky top-4">
              <MapContainerView
                events={filteredEvents}
                currentUser={currentUser}
                center={mapCenter}
                zoom={mapZoom}
                heightClass="h-[calc(100vh-230px)] min-h-[480px]"
                onTileError={handleTileError}
                onSelectEvent={handleSelectEvent}
              />
            </div>
            <div className="space-y-5 max-h-[calc(100vh-230px)] min-h-[480px] overflow-y-auto pr-1">
              {recommendedSection}
              {otherEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-tp-ink mb-2">Also happening nearby</h3>
                  <EventListView
                    events={otherEvents}
                    currentUser={currentUser}
                    viewMode="list"
                    onSelectEvent={handleSelectEvent}
                    onRsvpSuccess={handleRsvpSuccess}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          // Phone: map on top, recommendations stacked below
          <div className="space-y-4">
            <MapContainerView
              events={filteredEvents}
              currentUser={currentUser}
              center={mapCenter}
              zoom={mapZoom}
              heightClass="h-[44dvh] min-h-[280px]"
              onTileError={handleTileError}
              onSelectEvent={handleSelectEvent}
            />
            {recommendedSection}
            <button
              onClick={() => setViewMode('list')}
              className="w-full min-h-[44px] rounded-2xl border border-[#B39051]/35 bg-tp-surface text-xs text-tp-accent font-bold"
            >
              View all {filteredEvents.length} events as list →
            </button>
          </div>
        )
      ) : (
        <EventListView
          events={filteredEvents}
          currentUser={currentUser}
          viewMode={viewMode}
          hasTileError={hasTileError}
          onSelectEvent={handleSelectEvent}
          onRsvpSuccess={handleRsvpSuccess}
        />
      )}

      {/* Slide-Up Drawers */}
      <EventDetailDrawer
        event={selectedEvent}
        currentUser={currentUser}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRsvpSuccess={handleRsvpSuccess}
      />

      <HostEventDrawer
        currentUser={currentUser}
        isOpen={isHostOpen}
        onClose={() => setIsHostOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
};
