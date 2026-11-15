import React from 'react';
import { Clock, MapPin, Users, Sparkles, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { ScoredEventItem } from './types';
import { eventTimeLabel } from './eventTime';
import { UserProfile } from '../../shared/contracts';
import { Repository } from '../../shared/data/repository';
import { getCategoryLabel } from '../../shared/ui/categoryIcons';
import { formatDistance } from '../../shared/location';
import { avatarSrc } from '../../shared/ui/avatarSrc';

interface EventListViewProps {
  events: ScoredEventItem[];
  currentUser: UserProfile;
  viewMode: 'list' | 'grid';
  hasTileError?: boolean;
  onSelectEvent: (event: ScoredEventItem) => void;
  onRsvpSuccess: (updatedEvent: ScoredEventItem) => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  events,
  currentUser,
  viewMode,
  hasTileError = false,
  onSelectEvent,
  onRsvpSuccess,
}) => {
  const handleQuickRsvp = (e: React.MouseEvent, event: ScoredEventItem) => {
    e.stopPropagation();
    const isAttending = event.attendees.includes(currentUser.id);
    const success = Repository.rsvpEvent(event.id, currentUser.id);
    if (success) {
      const updatedAttendees = isAttending
        ? event.attendees.filter((id) => id !== currentUser.id)
        : [...event.attendees, currentUser.id];
      onRsvpSuccess({
        ...event,
        attendees: updatedAttendees,
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Tile Error Fallback Notice */}
      {hasTileError && (
        <div
          data-testid="tile-error-banner"
          className="p-3.5 rounded-2xl bg-[#051E39]/90 tp-on-navy border border-[#B39051] flex items-center gap-3 text-xs text-tp-muted shadow-md"
        >
          <AlertTriangle className="w-5 h-5 text-tp-accent flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-tp-accent">Map tiles restricted or unavailable</p>
            <p className="text-tp-muted">
              Operating in seamless Fallback View. Browse, filter, and RSVP to campus events below.
            </p>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="p-8 text-center bg-tp-surface rounded-3xl border border-[#B39051]/35">
          <p className="text-sm font-semibold text-tp-muted">No events found matching your criteria</p>
          <p className="text-xs text-tp-subtle mt-1">Try adjusting your filters or host a new campus pop-up!</p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {events.map((event) => {
            const isAttending = event.attendees.includes(currentUser.id);
            const spotsRemaining = Math.max(0, event.maxAttendees - event.attendees.length);
            const isFull = spotsRemaining === 0 && !isAttending;

            return (
              <div
                key={event.id}
                data-testid={`event-card-${event.id}`}
                onClick={() => onSelectEvent(event)}
                className={`p-4 rounded-2xl bg-tp-surface border transition cursor-pointer hover:border-[#B39051] hover:shadow-lg relative overflow-hidden flex flex-col justify-between ${
                  event.isRecommended
                    ? 'border-[#B39051]/60 ring-1 ring-[#B39051]/30'
                    : 'border-[#B39051]/35'
                }`}
              >
                {/* Recommended Badge */}
                {event.isRecommended && (
                  <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-lg bg-[#B39051] text-[#051E39] border border-[#B39051] self-start text-[11px] font-black tracking-wide">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {event.recommendedRank ? `#${event.recommendedRank} PICK • ` : ''}BUZZ MATCH ({event.score} PTS)
                    </span>
                  </div>
                )}

                {/* Match Reasons Pills */}
                {event.matchReasons && event.matchReasons.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {event.matchReasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B39051]/15 text-tp-accent border border-[#B39051]/30"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-tp-accent" />
                        <span>{reason}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  {/* Top Bar: Category & TTL */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-tp-accent uppercase tracking-wider text-[11px]">
                      {getCategoryLabel(event.category)}
                    </span>
                    <span className="text-tp-subtle font-medium text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-tp-accent" />
                      <span data-testid="event-time-label">{eventTimeLabel(event)}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-base text-tp-ink leading-snug mb-1.5 hover:text-tp-accent transition">
                    {event.title}
                  </h3>

                  {/* Location & Neighborhood */}
                  <div className="flex items-center gap-1.5 text-xs text-tp-muted mb-2">
                    <MapPin className="w-3.5 h-3.5 text-tp-accent flex-shrink-0" />
                    <span className="truncate">
                      <strong>{event.locationName}</strong> • {event.neighborhoodZone}
                    </span>
                    {event.distanceMiles !== undefined && (
                      <span data-testid="event-distance" className="shrink-0 text-tp-accent font-semibold">
                        · {formatDistance(event.distanceMiles)}
                      </span>
                    )}
                  </div>

                  {/* Description preview */}
                  <p className="text-xs text-tp-subtle line-clamp-2 mb-2.5">
                    {event.description}
                  </p>

                  {/* Who Is Going / Attendee Overlap Highlight */}
                  {event.attendeeHighlightText && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-tp-elevated/50 border border-[#B39051]/35 mb-3 text-[11px] text-tp-muted">
                      {event.overlappingAttendees && event.overlappingAttendees.length > 0 && (
                        <div className="flex -space-x-1.5 overflow-hidden flex-shrink-0">
                          {event.overlappingAttendees.map((att) => (
                            <img
                              key={att.id}
                              src={avatarSrc(att.avatarUrl)}
                              alt={att.name}
                              title={`${att.name} (${att.reason})`}
                              className="inline-block w-5 h-5 rounded-full ring-1 ring-[#B39051] object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <span className="truncate font-medium">{event.attendeeHighlightText}</span>
                    </div>
                  )}

                  {/* Host info and tags */}
                  <div className="flex items-center gap-2 mb-3">
                    {event.hostAvatarUrl ? (
                      <img
                        src={avatarSrc(event.hostAvatarUrl)}
                        alt={event.hostName}
                        className="w-6 h-6 rounded-full object-cover border border-[#B39051]"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#051E39] tp-on-navy border border-[#B39051] flex items-center justify-center text-[10px] text-tp-accent font-bold">
                        {event.hostName[0]}
                      </div>
                    )}
                    <span className="text-xs text-tp-muted font-medium">
                      Hosted by {event.hostName}
                    </span>
                    {event.isHostAlum && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#B39051] text-[#051E39] border border-[#B39051]">
                        ALUM
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer: Spots & Quick RSVP */}
                <div className="pt-3 border-t border-tp-line/50 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-tp-muted">
                    <Users className="w-3.5 h-3.5 text-tp-accent" />
                    <span>
                      {isFull ? (
                        <span className="text-rose-400 font-semibold">Full</span>
                      ) : (
                        <span>
                          <strong className="text-tp-ink">{spotsRemaining}</strong> spots open
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleQuickRsvp(e, event)}
                      disabled={isFull}
                      data-testid={`quick-rsvp-${event.id}`}
                      className={`min-h-[44px] px-4 rounded-xl text-xs font-black transition active:scale-95 flex items-center gap-1 ${
                        isAttending
                          ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]'
                          : isFull
                          ? 'bg-tp-elevated text-tp-subtle cursor-not-allowed'
                          : 'bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D]'
                      }`}
                    >
                      {isAttending ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Going</span>
                        </>
                      ) : (
                        <span>RSVP</span>
                      )}
                    </button>
                    <button
                      onClick={() => onSelectEvent(event)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-tp-elevated hover:bg-[#B39051]/15 text-tp-muted hover:text-tp-ink transition"
                      aria-label="View details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
