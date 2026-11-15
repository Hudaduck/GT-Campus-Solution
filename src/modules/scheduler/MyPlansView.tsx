import React, { useState, useEffect } from 'react';
import { CalendarDays, CalendarPlus, ChevronRight, Coffee, Zap, MapPin, Clock, Download, Ticket, Map as MapIcon, Users, MessageCircle, Video, Star } from 'lucide-react';
import { EventItem, MatchItem, CalendarMeetup, UserProfile } from '../../shared/contracts';
import { Repository, USER_CHANGED_EVENT, isSamePerson } from '../../shared/data/repository';
import { LayoutMode } from '../../shared/ui/layout';
import { generateIcsFile, generateGoogleCalendarUrl, downloadIcsFile, formatDuration } from './calendarUtils';
import { SchedulerDrawer } from './SchedulerDrawer';
import { getCategoryLabel } from '../../shared/ui/categoryIcons';
import { ChatDrawer } from './ChatDrawer';
import { avatarSrc } from '../../shared/ui/avatarSrc';
import { directionsUrl, eventDirectionsUrl } from '../../shared/maps';
import { EventDetailDrawer, getEventScoreDetails, type ScoredEventItem } from '../events-map';

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
  const [activeTab, setActiveTab] = useState<'all' | 'meetups' | 'events' | 'hosting' | 'matches' | 'messages'>('all');
  const [rescheduleMeetup, setRescheduleMeetup] = useState<CalendarMeetup | null>(null);
  const [cancelArmedId, setCancelArmedId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Keep the inbox fresh (simulated replies "arrive" a moment after sending)
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!cancelArmedId) return;
    const t = window.setTimeout(() => setCancelArmedId(null), 4000);
    return () => window.clearTimeout(t);
  }, [cancelArmedId]);

  // Scheduler Drawer state for rescheduling or scheduling from match
  const [schedulerPartner, setSchedulerPartner] = useState<UserProfile | null>(null);
  const [schedulerMatchId, setSchedulerMatchId] = useState<string | undefined>(undefined);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState<boolean>(false);
  const [chatPartner, setChatPartner] = useState<UserProfile | null>(null);
  // Pop-up opened from a card: the same event info sheet as on the map
  const [detailEvent, setDetailEvent] = useState<ScoredEventItem | null>(null);

  const loadData = () => {
    const user = Repository.getCurrentUser();
    setCurrentUser(user);
    const allEvents = Repository.getEvents();
    // Filter events where user is attendee or host
    // "Me" includes my demo seed twin (same person, different id), see isSamePerson()
    const myIds = new Set([user.id, ...Repository.getProfiles().filter((p) => isSamePerson(p, user)).map((p) => p.id)]);
    const myEvents = allEvents.filter(
      (e) => myIds.has(e.hostId) || (e.attendees ?? []).some((id) => myIds.has(id))
    );
    setEvents(myEvents);
    // Only this viewer's own matches and meetups (the demo has two personas sharing storage)
    setMatches(Repository.getMatchesFor(user));
    setMeetups(Repository.getMeetupsFor(user));
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

  const openEventDetails = (event: EventItem) => {
    const details = getEventScoreDetails(event, currentUser, Repository.getProfiles());
    setDetailEvent({
      ...event,
      score: details.score,
      isRecommended: false,
      sharedHobbies: event.tags.filter((t) => currentUser.hobbies.some((h) => h.toLowerCase() === t.toLowerCase())),
      matchReasons: details.matchReasons,
      attendeeHighlightText: details.attendeeHighlightText,
      overlappingAttendees: details.overlappingAttendees,
    });
  };

  // Leave a pop-up you joined
  const handleCancelRsvp = (eventId: string) => {
    Repository.rsvpEvent(eventId, currentUser.id);
    loadData();
  };

  // Delete a pop-up you host: first tap arms it, second tap deletes (shares the cancel timer)
  const handleDeleteEvent = (eventId: string) => {
    const key = `event:${eventId}`;
    if (cancelArmedId !== key) {
      setCancelArmedId(key);
      return;
    }
    Repository.deleteEvent(eventId, currentUser);
    setCancelArmedId(null);
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

  // Cancel a meetup: first tap arms it, second tap cancels (and leaves a note in the chat)
  const handleCancelMeetup = (meetupId: string) => {
    if (cancelArmedId !== meetupId) {
      setCancelArmedId(meetupId);
      return;
    }
    Repository.cancelMeetup(meetupId, currentUser);
    setCancelArmedId(null);
    loadData();
  };

  const partnerFor = (meetup: CalendarMeetup): UserProfile | undefined =>
    matches.find((m) => m.id === meetup.matchId)?.partnerProfile ??
    Repository.getProfiles().find((p) => p.id === meetup.partnerId);

  const openReschedule = (meetup: CalendarMeetup) => {
    const partner = partnerFor(meetup);
    if (!partner) return;
    setRescheduleMeetup(meetup);
    setSchedulerPartner(partner);
    setSchedulerMatchId(meetup.matchId);
    setIsSchedulerOpen(true);
  };

  // Open scheduler for a match
  const handleScheduleFromMatch = (match: MatchItem) => {
    setRescheduleMeetup(null);
    setSchedulerPartner(match.partnerProfile);
    setSchedulerMatchId(match.id);
    setIsSchedulerOpen(true);
  };

  // Someone you already have a meetup with isn't "pending" anymore
  const scheduledPartners = new Set(meetups.map((m) => m.partnerId));
  const pendingMatches = matches.filter((m) => m.status === 'matched' && !scheduledPartners.has(m.partnerProfile.id));

  // Inbox: this viewer's conversations, newest first
  const conversations = Repository.getConversations(currentUser, nowTick);
  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);

  // Web "All" view is a two-column dashboard: 1-on-1s + matches left, event RSVPs right
  const isDashboard = layout === 'web' && activeTab === 'all';
  // Inside a half-width dashboard column, a second split makes cards too narrow to read
  const cardGrid = isDashboard ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3';
  const hostedEvents = events.filter((e) => e.hostId === currentUser.id);
  const joinedEvents = events.filter((e) => e.hostId !== currentUser.id);

  // Pop-up lists: ones you host and ones you joined share the same card
  const renderEventSection = (kind: 'hosting' | 'going', list: EventItem[]) => (
    <section data-testid={`plans-section-${kind}`} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-2">
          {kind === 'hosting' ? <Star className="w-3.5 h-3.5" /> : <Ticket className="w-3.5 h-3.5" />}
          <span>
            {kind === 'hosting' ? "Pop-ups you're hosting" : "Pop-ups you're going to"} ({list.length})
          </span>
        </h3>
      </div>

      {list.length === 0 ? (
        <div className="p-6 bg-tp-surface/80 rounded-2xl border border-dashed border-[#B39051]/35 text-center space-y-2">
          <p className="text-sm text-tp-muted">
            {kind === 'hosting' ? "You're not hosting any pop-ups yet." : "You haven't RSVP'd to any events yet."}
          </p>
          <p className="text-xs text-tp-subtle">
            {kind === 'hosting'
              ? 'Schedule one from the map with "Host a Pop-Up".'
              : 'Explore Georgia Tech & Midtown pop-ups on the interactive map radar.'}
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
          {list.map((event) => {
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
                data-testid="plans-event-card"
                role="button"
                tabIndex={0}
                aria-label={`${event.title}: event details`}
                // The whole card opens the event info; its own buttons and links do their own thing
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a, button')) return;
                  openEventDetails(event);
                }}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openEventDetails(event);
                  }
                }}
                className="bg-tp-surface border border-[#B39051]/35 rounded-2xl p-4 shadow-md flex flex-col justify-between hover:border-[#B39051]/60 transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B39051]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/30 inline-block mb-1">
                        {getCategoryLabel(event.category)}
                      </span>
                      {event.hostId === currentUser.id && (
                        <span
                          data-testid="hosting-badge"
                          className="ml-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#B39051] text-[#051E39] inline-block mb-1"
                        >
                          Hosting
                        </span>
                      )}
                      <h4 className="font-bold text-tp-ink text-sm leading-snug line-clamp-2">
                        {event.title}
                        <ChevronRight aria-hidden="true" className="inline w-3.5 h-3.5 ml-0.5 -mt-0.5 text-tp-accent" />
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
                    <a
                      href={eventDirectionsUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="event-directions"
                      className="flex items-start gap-1.5 text-tp-muted hover:text-tp-ink"
                    >
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="text-tp-ink font-semibold underline decoration-[#B39051]/60 underline-offset-2">
                          {event.locationName}
                        </span>
                        <span className="text-tp-accent"> · {event.address || event.neighborhoodZone}</span>
                      </span>
                      <span className="shrink-0 text-tp-accent font-bold">Directions</span>
                    </a>
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
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#B39051] text-[#051E39] font-bold text-xs whitespace-nowrap hover:bg-[#8F713D] active:bg-[#8F713D] transition text-center"
                  >
                    <CalendarPlus className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />Google Calendar
                  </a>
                  {event.hostId === currentUser.id ? (
                    <button
                      data-testid="event-delete"
                      onClick={() => handleDeleteEvent(event.id)}
                      className={`text-xs px-2 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                        cancelArmedId === `event:${event.id}`
                          ? 'bg-red-500 text-white'
                          : 'text-tp-subtle hover:text-red-400'
                      }`}
                    >
                      {cancelArmedId === `event:${event.id}` ? 'Tap to delete' : 'Delete'}
                    </button>
                  ) : (
                    <button
                      data-testid="event-leave"
                      onClick={() => handleCancelRsvp(event.id)}
                      className="py-1.5 px-3 rounded-lg border border-red-500/40 text-red-400 font-semibold text-xs hover:bg-red-500/10 transition whitespace-nowrap"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );


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
            Pop-ups you're hosting or going to, 1-on-1 meetups (in person or online), and mutual Yellow Jacket matches.
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
            RSVPs ({joinedEvents.length})
          </button>
          <button
            data-testid="plans-tab-hosting"
            onClick={() => setActiveTab('hosting')}
            className={`px-3 min-h-[36px] whitespace-nowrap rounded-lg text-xs font-semibold transition ${
              activeTab === 'hosting'
                ? 'bg-[#B39051] text-[#051E39]'
                : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            Hosting ({hostedEvents.length})
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
          <button
            data-testid="plans-tab-messages"
            onClick={() => setActiveTab('messages')}
            className={`relative px-3 min-h-[36px] whitespace-nowrap rounded-lg text-xs font-semibold transition ${
              activeTab === 'messages'
                ? 'bg-[#B39051] text-[#051E39]'
                : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            Messages ({conversations.length})
            {unreadTotal > 0 && (
              <span
                aria-label={`${unreadTotal} unread`}
                className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold"
              >
                {unreadTotal}
              </span>
            )}
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
                      ) : meetup.format !== 'online' && meetup.locationAddress ? (
                        <a
                          href={directionsUrl(meetup.locationAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="meetup-directions"
                          className="block text-[11px] text-tp-muted underline decoration-[#B39051]/60 underline-offset-2 hover:text-tp-ink pl-6"
                        >
                          {meetup.locationAddress}
                          <span className="ml-1.5 no-underline text-tp-accent font-bold">Directions</span>
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
                          {' '}({formatDuration(meetup.durationMinutes)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#B39051]/35 space-y-2">
                    <div className="flex items-center gap-2">
                      {partnerFor(meetup) && (
                        <button
                          onClick={() => setChatPartner(partnerFor(meetup)!)}
                          aria-label={`Message ${meetup.partnerName}`}
                          className="py-1.5 px-2.5 rounded-lg border border-[#B39051]/50 text-tp-accent text-xs hover:bg-tp-elevated transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        data-testid="meetup-reschedule"
                        onClick={() => openReschedule(meetup)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-[#B39051]/50 text-tp-ink font-semibold text-xs hover:bg-tp-elevated transition text-center"
                      >
                        Reschedule
                      </button>
                      {meetup.googleCalendarUrl && (
                        <a
                          href={meetup.googleCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#B39051] text-[#051E39] font-bold text-xs whitespace-nowrap hover:bg-[#8F713D] active:bg-[#8F713D] transition text-center"
                        >
                          <CalendarPlus className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />Google Calendar
                        </a>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      {meetup.icsContent ? (
                        <button
                          onClick={() =>
                            downloadIcsFile(`ThirdPlace-${meetup.partnerName.replace(/\s+/g, '_')}.ics`, meetup.icsContent!)
                          }
                          className="text-tp-subtle hover:text-tp-ink underline"
                        >
                          <Download className="inline w-3 h-3 mr-1 -mt-0.5" />.ics
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        data-testid="meetup-cancel"
                        onClick={() => handleCancelMeetup(meetup.id)}
                        className={`px-2 py-1 rounded-lg font-semibold transition ${
                          cancelArmedId === meetup.id
                            ? 'bg-red-500 text-white'
                            : 'text-tp-subtle hover:text-red-400'
                        }`}
                      >
                        {cancelArmedId === meetup.id ? 'Tap again to cancel' : 'Cancel meetup'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Pop-ups: hosting + going */}
      {(activeTab === 'all' || activeTab === 'events' || activeTab === 'hosting') && (
        <div className={`space-y-6 ${isDashboard ? 'col-start-2 row-start-1 row-span-2' : ''}`}>
          {(activeTab === 'hosting' || (activeTab === 'all' && hostedEvents.length > 0)) &&
            renderEventSection('hosting', hostedEvents)}
          {activeTab !== 'hosting' && renderEventSection('going', joinedEvents)}
        </div>
      )}

      {/* Messages: conversations with unread dots */}
      {activeTab === 'messages' && (
        <section data-testid="inbox" className="space-y-2">
          {conversations.length === 0 ? (
            <div className="p-6 bg-tp-surface/80 rounded-2xl border border-dashed border-[#B39051]/35 text-center space-y-2">
              <p className="text-sm text-tp-muted">No conversations yet.</p>
              <p className="text-xs text-tp-subtle">Match with someone in Connect 1-on-1 and say hi.</p>
            </div>
          ) : (
            conversations.map(({ match, partner, last, unread }) => (
              <button
                key={match.id}
                type="button"
                data-testid="inbox-row"
                onClick={() => setChatPartner(partner)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-tp-surface border border-[#B39051]/35 hover:border-[#B39051]/70 transition text-left"
              >
                <img
                  src={avatarSrc(partner.avatarUrl)}
                  alt={partner.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#B39051] shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${unread ? 'font-black text-tp-ink' : 'font-bold text-tp-ink'}`}>
                      {partner.name}
                    </span>
                    <span className="text-[10px] text-tp-subtle shrink-0">
                      {new Date(last.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className={`block text-xs truncate ${unread ? 'text-tp-ink' : 'text-tp-muted'}`}>
                    {last.senderId === currentUser.id ? 'You: ' : ''}
                    {last.text}
                  </span>
                </span>
                {unread > 0 && (
                  <span
                    data-testid="inbox-unread"
                    aria-label={`${unread} unread`}
                    className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
                  >
                    {unread}
                  </span>
                )}
              </button>
            ))
          )}
        </section>
      )}

      {/* 3a. Matches tab with nothing pending: explain and point to Connect */}
      {activeTab === 'matches' && pendingMatches.length === 0 && (
        <div
          data-testid="matches-empty"
          className="p-6 bg-tp-surface/80 rounded-2xl border border-dashed border-[#B39051]/35 text-center space-y-2"
        >
          <p className="text-sm text-tp-muted">No pending matches right now.</p>
          <p className="text-xs text-tp-subtle">
            Connect with students and alumni in Connect 1-on-1. Matches you haven't scheduled yet show up here.
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
                    src={avatarSrc(match.partnerProfile.avatarUrl)}
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

      {/* Event info (same sheet as the map): RSVP / leave, directions, host delete */}
      <EventDetailDrawer
        event={detailEvent}
        currentUser={currentUser}
        isOpen={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        onRsvpSuccess={(updated) => {
          setDetailEvent(updated);
          loadData();
        }}
        onDeleted={() => {
          setDetailEvent(null);
          loadData();
        }}
      />

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
        onClose={() => {
          setIsSchedulerOpen(false);
          setRescheduleMeetup(null);
          loadData();
        }}
        partner={schedulerPartner}
        matchId={schedulerMatchId}
        existingMeetup={rescheduleMeetup}
        onScheduled={() => {
          loadData();
        }}
      />
    </div>
  );
};
