import React, { useState, useEffect } from 'react';
import { CalendarDays, Coffee, Zap, MapPin, Clock, Download, Ticket, Map as MapIcon, Users, MessageCircle, Video } from 'lucide-react';
import { EventItem, MatchItem, CalendarMeetup, UserProfile } from '../../shared/contracts';
import { Repository, USER_CHANGED_EVENT } from '../../shared/data/repository';
import { LayoutMode } from '../../shared/ui/layout';
import { generateIcsFile, generateGoogleCalendarUrl, downloadIcsFile } from './calendarUtils';
import { SchedulerDrawer } from './SchedulerDrawer';
import { getCategoryLabel } from '../../shared/ui/categoryIcons';
import { ChatDrawer } from './ChatDrawer';

interface MyPlansViewProps {
  onNavigateToRadar?: () => void;
  onNavigateToMap?: () => void;
  layout?: LayoutMode;
}

export const MyPlansView: React.FC<MyPlansViewProps> = ({
  onNavigateToRadar,
  onNavigateToMap,
  layout = 'phone',
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(Repository.getCurrentUser());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [meetups, setMeetups] = useState<CalendarMeetup[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'meetups' | 'events' | 'matches'>('all');

  // Scheduler Drawer state for rescheduling or scheduling from match
  const [schedulerPartner, setSchedulerPartner] = useState<UserProfile | null>(null);
  const [schedulerMatchId, setSchedulerMatchId] = useState<string | undefined>(undefined);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState<boolean>(false);
  const [chatPartner, setChatPartner] = useState<UserProfile | null>(null);

  const loadData = () => {
    const user = Repository.getCurrentUser();
    setCurrentUser(user);
    const allEvents = Repository.getEvents();
    // Filter events where user is attendee or host
    const myEvents = allEvents.filter(
      (e) => e.attendees?.includes(user.id) || e.hostId === user.id
    );
    setEvents(myEvents);
    setMatches(Repository.getMatches());
    setMeetups(Repository.getScheduledMeetups());
  };

  useEffect(() => {
    loadData();
    // Listen for storage changes if any
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(USER_CHANGED_EVENT, handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(USER_CHANGED_EVENT, handleStorage);
    };
  }, []);

  // Handle Event RSVP cancellation
  const handleCancelRsvp = (eventId: string) => {
    Repository.rsvpEvent(eventId, currentUser.id);
    loadData();
  };

  // Handle Event .ics export
  const handleDownloadEventIcs = (event: EventItem) => {
    const icsContent = generateIcsFile({
      title: event.title,
      description: `${event.description}\nHost: ${event.hostName} (${event.hostRole})\nTags: ${event.tags.join(', ')}`,
      locationName: event.locationName,
      locationAddress: event.neighborhoodZone,
      startTime: event.startTime,
      durationMinutes: Math.round(
        (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000
      ) || 120,
    });
    downloadIcsFile(`GT-Event-${event.title.replace(/\s+/g, '_')}.ics`, icsContent);
  };

  // Handle Meetup cancellation
  const handleCancelMeetup = (meetupId: string) => {
    const currentMeetups = Repository.getScheduledMeetups();
    const updated = currentMeetups.filter((m) => m.id !== meetupId);
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      localStorage.setItem('thirdplace_meetups_data', JSON.stringify(updated));
    }
    loadData();
  };

  // Open scheduler for a match
  const handleScheduleFromMatch = (match: MatchItem) => {
    setSchedulerPartner(match.partnerProfile);
    setSchedulerMatchId(match.id);
    setIsSchedulerOpen(true);
  };

  // Someone you already have a meetup with isn't "pending" anymore
  const scheduledPartners = new Set(meetups.map((m) => m.partnerId));
  const pendingMatches = matches.filter((m) => m.status === 'matched' && !scheduledPartners.has(m.partnerProfile.id));

  // Web "All" view is a two-column dashboard: 1-on-1s + matches left, event RSVPs right
  const isDashboard = layout === 'web' && activeTab === 'all';
  // Inside a half-width dashboard column, a second split makes cards too narrow to read
  const cardGrid = isDashboard ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3';

  return (
    <div
      data-testid="my-plans-view"
      className={`mx-auto space-y-6 ${layout === 'web' ? 'max-w-6xl px-6 py-6' : 'max-w-4xl px-4 py-5'}`}
    >
      {/* Header */}
      <div
        className={`flex justify-between gap-3 border-b border-[#B39051]/35 pb-4 ${
          layout === 'web' ? 'flex-row items-center' : 'flex-col'
        }`}
      >
        <div>
          <h2 className="text-2xl font-black text-tp-ink flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-tp-accent" />
            <span>My Plans & Connections</span>
          </h2>
          <p className="text-xs text-tp-muted mt-0.5">
            Confirmed pop-up RSVPs, 1-on-1 meetups (in person or online), and mutual Yellow Jacket matches.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1 bg-tp-surface p-1 rounded-xl border border-[#B39051]/35 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 min-h-[36px] whitespace-nowrap rounded-lg text-xs font-semibold transition ${
              activeTab === 'all'
                ? 'bg-[#B39051] text-[#051E39]'
                : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            All ({meetups.length + events.length + pendingMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('meetups')}
            className={`px-3 min-h-[36px] whitespace-nowrap rounded-lg text-xs font-semibold transition ${
              activeTab === 'meetups'
                ? 'bg-[#B39051] text-[#051E39]'
                : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            1-on-1 ({meetups.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 min-h-[36px] whitespace-nowrap rounded-lg text-xs font-semibold transition ${
              activeTab === 'events'
                ? 'bg-[#B39051] text-[#051E39]'
                : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            RSVPs ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-3 min-h-[36px] whitespace-nowrap rounded-lg text-xs font-semibold transition ${
              activeTab === 'matches'
                ? 'bg-[#B39051] text-[#051E39]'
                : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            Matches ({pendingMatches.length})
          </button>
        </div>
      </div>

      <div className={isDashboard ? 'grid grid-cols-2 gap-6 items-start' : 'space-y-6'}>
      {/* 1. Scheduled 1-on-1 Meetups Section */}
      {(activeTab === 'all' || activeTab === 'meetups') && (
        <section className={`space-y-3 ${isDashboard ? 'col-start-1' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-2">
              <Coffee className="w-3.5 h-3.5" />
              <span>Scheduled 1-on-1 Meetups ({meetups.length})</span>
            </h3>
          </div>

          {meetups.length === 0 ? (
            <div className="p-6 bg-tp-surface/80 rounded-2xl border border-dashed border-[#B39051]/35 text-center space-y-2">
              <p className="text-sm text-tp-muted">No scheduled 1-on-1 meetups yet.</p>
              <p className="text-xs text-tp-subtle">
                Find students and alumni in Connect 1-on-1, message them, then meet in person or online.
              </p>
              {onNavigateToRadar && (
                <button
                  onClick={onNavigateToRadar}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Open Connect 1-on-1</span>
                </button>
              )}
            </div>
          ) : (
            <div className={cardGrid}>
              {meetups.map((meetup) => (
                <div
                  key={meetup.id}
                  className="bg-tp-surface border border-[#B39051]/35 rounded-2xl p-4 shadow-md flex flex-col justify-between hover:border-[#B39051]/60 transition"
                >
                  <div>
                    {/* Partner Header */}
                    <div className="flex items-center gap-3">
                      <img
                        src={meetup.partnerAvatar}
                        alt={meetup.partnerName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#B39051]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-tp-ink text-sm truncate">
                            {meetup.partnerName}
                          </h4>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/40">
                            {meetup.partnerRole}
                          </span>
                        </div>
                        <p className="text-xs text-tp-muted truncate">
                          {meetup.partnerMajorOrCompany}
                        </p>
                      </div>
                    </div>

                    {/* Location & Time */}
                    <div className="mt-3.5 bg-tp-elevated p-3 rounded-xl border border-[#B39051]/35 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-tp-ink">
                        {meetup.format === 'online' ? (
                          <Video className="w-3.5 h-3.5 shrink-0 text-tp-accent" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-tp-accent" />
                        )}
                        <span className="font-semibold">{meetup.locationName}</span>
                        <span className="text-[10px] uppercase tracking-wider text-tp-subtle">
                          {meetup.format === 'online' ? 'Online' : 'In person'}
                        </span>
                      </div>
                      {meetup.meetingLink ? (
                        <a
                          href={meetup.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[11px] text-tp-accent underline pl-6 truncate"
                        >
                          Join meeting
                        </a>
                      ) : (
                        <p className="text-[11px] text-tp-muted pl-6">
                          {meetup.locationAddress}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-tp-accent pt-1">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-tp-accent" />
                        <span className="font-semibold">
                          {new Date(meetup.scheduledTime).toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' '}({meetup.durationMinutes} min)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#B39051]/35 flex items-center gap-2">
                    {(() => {
                      const partner = matches.find((m) => m.id === meetup.matchId)?.partnerProfile;
                      return partner ? (
                        <button
                          onClick={() => setChatPartner(partner)}
                          aria-label={`Message ${meetup.partnerName}`}
                          className="py-1.5 px-2.5 rounded-lg border border-[#B39051]/50 text-tp-accent text-xs hover:bg-tp-elevated transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : null;
                    })()}
                    {meetup.icsContent && (
                      <button
                        onClick={() =>
                          downloadIcsFile(
                            `ThirdPlace-${meetup.partnerName.replace(/\s+/g, '_')}.ics`,
                            meetup.icsContent!
                          )
                        }
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-[#B39051]/50 bg-[#051E39] tp-on-navy text-tp-ink font-semibold text-xs hover:bg-tp-elevated transition text-center"
                      >
                        <Download className="inline w-3 h-3 mr-1 -mt-0.5" />.ics
                      </button>
                    )}
                    {meetup.googleCalendarUrl && (
                      <a
                        href={meetup.googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition text-center"
                      >
                        Google Cal
                      </a>
                    )}
                    <button
                      onClick={() => handleCancelMeetup(meetup.id)}
                      className="text-tp-subtle hover:text-red-400 text-xs px-2 py-1.5"
                      title="Cancel Meetup"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Confirmed Event RSVPs Section */}
      {(activeTab === 'all' || activeTab === 'events') && (
        <section className={`space-y-3 ${isDashboard ? 'col-start-2 row-start-1 row-span-2' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-2">
              <Ticket className="w-3.5 h-3.5" />
              <span>Confirmed Pop-Up Event RSVPs ({events.length})</span>
            </h3>
          </div>

          {events.length === 0 ? (
            <div className="p-6 bg-tp-surface/80 rounded-2xl border border-dashed border-[#B39051]/35 text-center space-y-2">
              <p className="text-sm text-tp-muted">You haven't RSVP'd to any events yet.</p>
              <p className="text-xs text-tp-subtle">
                Explore Georgia Tech & Midtown pop-ups on the interactive map radar.
              </p>
              {onNavigateToMap && (
                <button
                  onClick={onNavigateToMap}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition inline-flex items-center gap-1.5"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Explore Map Radar</span>
                </button>
              )}
            </div>
          ) : (
            <div className={cardGrid}>
              {events.map((event) => {
                const googleCalUrl = generateGoogleCalendarUrl({
                  title: event.title,
                  description: `${event.description}\nHost: ${event.hostName}`,
                  locationName: event.locationName,
                  locationAddress: event.neighborhoodZone,
                  startTime: event.startTime,
                  durationMinutes: Math.round(
                    (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000
                  ) || 120,
                });

                return (
                  <div
                    key={event.id}
                    className="bg-tp-surface border border-[#B39051]/35 rounded-2xl p-4 shadow-md flex flex-col justify-between hover:border-[#B39051]/60 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/30 inline-block mb-1">
                            {getCategoryLabel(event.category)}
                          </span>
                          <h4 className="font-bold text-tp-ink text-sm leading-snug line-clamp-2">
                            {event.title}
                          </h4>
                        </div>
                        <span className="text-xs text-tp-muted bg-tp-elevated px-2 py-1 rounded-lg shrink-0">
                          <Users className="inline w-3 h-3 mr-1 -mt-0.5" />
                        {event.attendees?.length || 1} / {event.maxAttendees}
                        </span>
                      </div>

                      <p className="text-xs text-tp-muted mt-2 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="mt-3 bg-tp-elevated p-2.5 rounded-xl border border-[#B39051]/35 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-tp-muted">
                          <MapPin className="w-3 h-3 shrink-0" />
                        <span>{event.locationName}</span>
                          <span className="text-tp-accent">{event.neighborhoodZone}</span>
                        </div>
                        <div className="text-tp-accent font-semibold">
                          <Clock className="inline w-3 h-3 mr-1 -mt-0.5" />
                          {new Date(event.startTime).toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-[#B39051]/35 flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadEventIcs(event)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-[#B39051]/50 bg-[#051E39] tp-on-navy text-tp-ink font-semibold text-xs hover:bg-tp-elevated transition text-center"
                      >
                        <Download className="inline w-3 h-3 mr-1 -mt-0.5" />.ics
                      </button>
                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition text-center"
                      >
                        Google Cal
                      </a>
                      <button
                        onClick={() => handleCancelRsvp(event.id)}
                        className="text-tp-subtle hover:text-red-400 text-xs px-2 py-1.5"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. 1-on-1 Matches Section */}
      {(activeTab === 'all' || activeTab === 'matches') && pendingMatches.length > 0 && (
        <section className={`space-y-3 ${isDashboard ? 'col-start-1' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Pending 1-on-1 Matches ({pendingMatches.length})</span>
            </h3>
          </div>

          <div className={cardGrid}>
            {pendingMatches.map((match) => (
              <div
                key={match.id}
                data-testid="pending-match-card"
                className="bg-tp-surface border border-[#B39051]/40 rounded-2xl p-4 shadow-md flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={match.partnerProfile.avatarUrl}
                    alt={match.partnerProfile.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#B39051] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="font-bold text-tp-ink text-sm leading-tight break-words">
                        {match.partnerProfile.name}
                      </h4>
                      <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#8F713D] text-white">
                        {match.partnerProfile.role}
                      </span>
                    </div>
                    <p className="text-xs text-tp-muted mt-0.5 line-clamp-2">
                      {match.partnerProfile.companyOrLab || match.partnerProfile.major}
                    </p>
                    {match.sharedHobbies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {match.sharedHobbies.slice(0, 3).map((h) => (
                          <span key={h} className="text-[10px] bg-[#B39051]/20 text-tp-accent px-1.5 py-0.5 rounded">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatPartner(match.partnerProfile)}
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition whitespace-nowrap shadow-md"
                  >
                    <MessageCircle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />Message
                  </button>
                  {Repository.hasConversation(match.id, currentUser.id) ? (
                    <button
                      onClick={() => handleScheduleFromMatch(match)}
                      className="flex-1 min-h-[40px] px-3 rounded-xl border border-[#B39051]/60 text-tp-ink font-semibold text-xs hover:bg-tp-elevated transition whitespace-nowrap"
                    >
                      <CalendarDays className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-tp-accent" />Schedule
                    </button>
                  ) : (
                    <span className="flex-1 text-[11px] text-tp-subtle leading-tight">
                      Chat first to plan a meetup
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={!!chatPartner}
        onClose={() => {
          setChatPartner(null);
          loadData();
        }}
        partner={chatPartner}
        onScheduled={() => loadData()}
      />

      {/* Scheduler Drawer */}
      <SchedulerDrawer
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        partner={schedulerPartner}
        matchId={schedulerMatchId}
        onScheduled={() => {
          loadData();
        }}
      />
    </div>
  );
};
