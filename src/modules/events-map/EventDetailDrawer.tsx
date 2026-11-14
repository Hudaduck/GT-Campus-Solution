import React, { useState } from 'react';
import { Clock, MapPin, Users, Share2, Check, X, Sparkles, Star, CalendarPlus } from 'lucide-react';
import { ScoredEventItem } from './types';
import { UserProfile } from '../../shared/contracts';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { Repository } from '../../shared/data/repository';

interface EventDetailDrawerProps {
  event: ScoredEventItem | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRsvpSuccess?: (updatedEvent: ScoredEventItem) => void;
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  event,
  currentUser,
  isOpen,
  onClose,
  onRsvpSuccess,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  if (!isOpen || !event) return null;

  const isAttending = event.attendees.includes(currentUser.id);
  const spotsRemaining = Math.max(0, event.maxAttendees - event.attendees.length);
  const isFull = spotsRemaining === 0 && !isAttending;
  const fillPercentage = Math.min(100, Math.round((event.attendees.length / event.maxAttendees) * 100));

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const calculateHoursLeft = (expiresAt: number) => {
    const msDiff = expiresAt - Date.now();
    if (msDiff <= 0) return 'Expired';
    const hours = Math.floor(msDiff / (1000 * 60 * 60));
    const mins = Math.floor((msDiff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `Expires in ${hours}h ${mins}m` : `Expires in ${mins}m`;
  };

  const handleToggleRsvp = () => {
    setRsvpLoading(true);
    const success = Repository.rsvpEvent(event.id, currentUser.id);
    if (success) {
      const updatedAttendees = isAttending
        ? event.attendees.filter((id) => id !== currentUser.id)
        : [...event.attendees, currentUser.id];
      const updatedEvent: ScoredEventItem = {
        ...event,
        attendees: updatedAttendees,
      };
      if (onRsvpSuccess) {
        onRsvpSuccess(updatedEvent);
      }
    }
    setRsvpLoading(false);
  };

  const handleShareLink = async () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}?event=${encodeURIComponent(event.id)}`
      : `https://thirdplace.gatech.edu/events/${event.id}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.warn('Could not copy link to clipboard:', e);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <div
      data-testid="event-detail-drawer"
      className="tp-sheet-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
        className="tp-sheet md:max-w-lg bg-tp-surface border-t md:border border-[#B39051]/35 px-5 pt-2 pb-5 md:p-6 text-tp-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetDragHandle onClose={onClose} />

        {/* Top bar with Category, TTL badge and Close button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/35">
              {event.category}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-tp-elevated text-tp-muted border border-tp-line">
              {calculateHoursLeft(event.expiresAt)}
            </span>
          </div>
          <button
            data-testid="close-drawer-button"
            onClick={onClose}
            className="p-1.5 text-tp-subtle hover:text-tp-ink rounded-full bg-tp-elevated hover:bg-[#B39051]/15 border border-tp-line transition"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-tp-ink leading-tight mb-2">
          {event.title}
        </h2>

        {/* Host card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-tp-elevated border border-[#B39051]/35 mb-4">
          <div className="relative">
            {event.hostAvatarUrl ? (
              <img
                src={event.hostAvatarUrl}
                alt={event.hostName}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#B39051]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#051E39] tp-on-navy border-2 border-[#B39051] flex items-center justify-center font-black text-tp-accent">
                {event.hostName[0]}
              </div>
            )}
            {event.isHostAlum && (
              <span className="absolute -bottom-1 -right-1 bg-[#051E39] tp-on-navy text-tp-accent text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-[#B39051]">
                ALUM
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-tp-ink truncate">{event.hostName}</span>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-[#B39051] text-[#051E39] border border-[#B39051]">
                {event.hostRole === 'alumni' ? 'GT Alum' : 'GT Student'}
              </span>
            </div>
            <p className="text-xs text-tp-muted truncate">Host & Community Lead</p>
          </div>
        </div>

        {/* Recommendation Affinity Banner if score > 0 */}
        {event.score > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#051E39]/90 tp-on-navy border border-[#B39051]/40 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-tp-accent flex-shrink-0" />
              <span className="font-black text-sm text-tp-accent tracking-wide">
                {event.score} PTS MULTI-FACTOR MATCH
              </span>
            </div>

            {/* Dynamic Reason Pills */}
            {event.matchReasons && event.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {event.matchReasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#B39051]/20 text-tp-accent border border-[#B39051]/40"
                  >
                    <Check className="w-3 h-3" />
                    <span>{reason}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Attendee Highlights with Avatars */}
            {event.attendeeHighlightText && (
              <div className="flex items-center gap-2.5 pt-1 text-xs text-tp-muted">
                {event.overlappingAttendees && event.overlappingAttendees.length > 0 && (
                  <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                    {event.overlappingAttendees.map((att) => (
                      <img
                        key={att.id}
                        src={att.avatarUrl}
                        alt={att.name}
                        title={`${att.name}: ${att.reason}`}
                        className="inline-block w-6 h-6 rounded-full ring-2 ring-[#051E39] object-cover"
                      />
                    ))}
                  </div>
                )}
                <span className="font-medium text-tp-muted">{event.attendeeHighlightText}</span>
              </div>
            )}
          </div>
        )}

        {/* Time and Location info */}
        <div className="space-y-2 mb-4 text-xs sm:text-sm text-tp-muted">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-tp-accent flex-shrink-0" />
            <span>
              {formatDateTime(event.startTime)} – {formatDateTime(event.endTime)}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-tp-accent flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-tp-ink">{event.locationName}</span>
              <span className="text-tp-subtle block text-xs">{event.neighborhoodZone}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 text-xs sm:text-sm text-tp-muted bg-tp-elevated/50 p-3 rounded-xl border border-tp-line/50">
          <p>{event.description}</p>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {event.tags.map((tag) => {
              const matchesUser = currentUser.hobbies.some(
                (h) => h.toLowerCase() === tag.toLowerCase()
              );
              return (
                <span
                  key={tag}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    matchesUser
                      ? 'bg-[#B39051]/20 text-tp-accent border border-[#B39051]/50 font-bold'
                      : 'bg-tp-elevated text-tp-muted border border-tp-line'
                  }`}
                >
                  #{tag} {matchesUser && <Star className="inline w-3 h-3 ml-0.5 -mt-0.5 fill-current" />}
                </span>
              );
            })}
          </div>
        )}

        {/* Spots Remaining Counter & Progress Bar */}
        <div className="mb-5 p-3 rounded-2xl bg-tp-elevated/50 border border-[#B39051]/35">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-tp-muted">
              <Users className="w-4 h-4 text-tp-accent" />
              <span className="font-semibold" data-testid="spots-remaining">
                {isFull ? (
                  <span className="text-rose-400 font-bold">Event is Full</span>
                ) : (
                  <span>
                    <strong className="text-tp-accent">{spotsRemaining}</strong> spots remaining
                  </span>
                )}
              </span>
            </span>
            <span className="text-tp-subtle">
              {event.attendees.length} / {event.maxAttendees} RSVP'd
            </span>
          </div>
          <div className="w-full bg-tp-elevated h-2.5 rounded-full overflow-hidden border border-tp-line">
            <div
              className="h-full bg-gradient-to-r from-[#8F713D] to-[#B39051] transition-all duration-300"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Action Buttons: 1-Tap RSVP & Shareable Link */}
        <div className="space-y-2.5">
          <button
            data-testid="rsvp-button"
            onClick={handleToggleRsvp}
            disabled={rsvpLoading || isFull}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] ${
              isAttending
                ? 'bg-tp-elevated text-tp-accent border-2 border-[#B39051] hover:bg-[#B39051]/15'
                : isFull
                ? 'bg-tp-elevated text-tp-subtle cursor-not-allowed border border-tp-line'
                : 'bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] border-2 border-[#B39051]'
            }`}
          >
            {isAttending ? (
              <>
                <Check className="w-5 h-5 text-tp-accent" />
                <span>Attending · Tap to Leave</span>
              </>
            ) : isFull ? (
              <span>Event is at Capacity</span>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4" />
                <span>RSVP (1-Tap Instant)</span>
              </>
            )}
          </button>

          <button
            data-testid="share-link-button"
            onClick={handleShareLink}
            className="w-full py-2.5 px-4 rounded-2xl font-bold text-xs bg-tp-elevated text-tp-muted border border-[#B39051]/35 hover:border-[#B39051] hover:text-tp-ink flex items-center justify-center gap-2 transition"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-tp-accent" />
                <span>Share Event Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
