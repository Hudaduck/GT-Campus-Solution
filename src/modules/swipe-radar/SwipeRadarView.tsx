import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, MeetupIntent, MatchItem, SwipeCandidate } from '../../shared/contracts';
import {
  Repository,
  USER_CHANGED_EVENT,
  buildSwipeCandidate,
  isSamePerson,
} from '../../shared/data/repository';
import {
  INTENT_CATALOG,
  INTENT_ORDER,
  describeMutualIntent,
  getMutualIntents,
  isIntentCompatible,
} from '../../shared/intents';
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Handshake,
  MapPin,
  MessageCircle,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { LayoutMode } from '../../shared/ui/layout';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { ChatDrawer } from '../scheduler';
import { MatchBreakdownCard } from './MatchBreakdownCard';

interface SwipeRadarViewProps {
  onNavigateToPlans?: () => void;
  onNavigateToMap?: () => void;
  layout?: LayoutMode;
}

// 'for-you' = only people whose intents line up with mine (default); 'all' = everyone;
// an intent id = people who have that intent (chip labels come from INTENT_CATALOG.filterLabel)
type IntentFilter = 'for-you' | 'all' | MeetupIntent;

const OPEN_TO_MEET_OPTIONS = [
  { label: '2 Hours', hours: 2, hint: 'Expires in 2h' },
  { label: '4 Hours', hours: 4, hint: 'Expires in 4h' },
  { label: '8 Hours', hours: 8, hint: 'Expires in 8h' },
  { label: '24 Hours', hours: 24, hint: 'Auto-expires in 24h' },
];

export const SwipeRadarView: React.FC<SwipeRadarViewProps> = ({
  onNavigateToPlans,
  onNavigateToMap,
  layout = 'phone',
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(Repository.getCurrentUser());
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('for-you');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'alumni'>('all');
  const [activeDeck, setActiveDeck] = useState<'radar' | 'reconnect'>('radar');

  // TTL Toggle Modal / state
  const [showTtlModal, setShowTtlModal] = useState<boolean>(false);

  // Match Modal state
  const [matchedProfile, setMatchedProfile] = useState<UserProfile | null>(null);
  const [showMatchModal, setShowMatchModal] = useState<boolean>(false);

  // "Tap for full profile" sheet
  const [isFullProfileOpen, setIsFullProfileOpen] = useState<boolean>(false);

  // Chat Drawer state: message a match first, then pick in-person or online
  const [chatPartner, setChatPartner] = useState<UserProfile | null>(null);

  // Load profiles and currentUser from Repository
  const loadData = () => {
    const user = Repository.getCurrentUser();
    setCurrentUser(user);
    const allProfiles = Repository.getProfiles().filter((p) => !isSamePerson(p, user));
    setProfiles(allProfiles);
  };

  useEffect(() => {
    loadData();
    const handleChange = () => loadData();
    window.addEventListener('storage', handleChange);
    window.addEventListener(USER_CHANGED_EVENT, handleChange);
    return () => {
      window.removeEventListener('storage', handleChange);
      window.removeEventListener(USER_CHANGED_EVENT, handleChange);
    };
  }, []);

  // Filter profiles and decorate them with viewer-relative hobby & career overlap
  const filteredProfiles: SwipeCandidate[] = useMemo(() => {
    const candidates = profiles
      .filter((p) => {
        const matchesIntent =
          intentFilter === 'all' ||
          (intentFilter === 'for-you' ? isIntentCompatible(currentUser, p) : p.intents.includes(intentFilter));
        const matchesRole = roleFilter === 'all' || p.role === roleFilter;
        return matchesIntent && matchesRole;
      })
      .map((p) => buildSwipeCandidate(currentUser, p));
    // Outside "For You", still surface people whose intents line up first (stable sort)
    return intentFilter === 'for-you'
      ? candidates
      : [...candidates].sort((a, b) => Number(isIntentCompatible(currentUser, b)) - Number(isIntentCompatible(currentUser, a)));
  }, [profiles, intentFilter, roleFilter, currentUser]);

  // Current candidate card
  const currentCandidate = filteredProfiles[currentIndex] || null;
  const sharedHobbies = currentCandidate?.sharedHobbies ?? [];
  const companyBadges = (currentCandidate?.careerBadges ?? []).filter(
    (b) => b.kind === 'works-at' || b.kind === 'ex-company'
  );
  const targetingBadges = (currentCandidate?.careerBadges ?? []).filter(
    (b) => b.kind === 'targeting' || b.kind === 'shared-target'
  );

  // Handle Swipe Actions
  const handlePass = () => {
    if (currentIndex < filteredProfiles.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleConnect = (candidate: UserProfile, _isSuper = false) => {
    const candidateShared = candidate.hobbies.filter((h) =>
      currentUser.hobbies.some((myH) => myH.toLowerCase() === h.toLowerCase())
    );

    // Save match to repository
    const matchId = `match_${Date.now()}`;
    const newMatch: MatchItem = {
      id: matchId,
      user1Id: currentUser.id,
      user2Id: candidate.id,
      partnerProfile: candidate,
      matchedAt: Date.now(),
      status: 'matched',
      sharedHobbies: candidateShared,
      mutualIntents: getMutualIntents(currentUser, candidate),
    };
    Repository.saveMatch(newMatch);

    // Trigger Double Opt-In Match Celebration
    setMatchedProfile(candidate);
    setShowMatchModal(true);

    if (currentIndex < filteredProfiles.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    setIsFullProfileOpen(false);
  }, [currentCandidate?.id, activeDeck]);

  // Handle TTL update for 'Open to Meet'
  const handleSetTtl = (hours: number | null) => {
    const updated = { ...currentUser };
    if (hours === null || hours <= 0) {
      updated.isOpenToMeet = false;
      delete updated.openToMeetExpiresAt;
    } else {
      updated.isOpenToMeet = true;
      updated.openToMeetExpiresAt = Date.now() + hours * 60 * 60 * 1000;
    }
    Repository.setCurrentUser(updated);
    setCurrentUser(updated);
    setShowTtlModal(false);
  };

  // Helper to format remaining TTL
  const formatTtlRemaining = (expiresAt?: number) => {
    if (!expiresAt) return null;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Collect Re-Connect attendees from recent events
  const reconnectAttendees = useMemo(() => {
    const events = Repository.getEvents();
    const map = new Map<string, { profile: UserProfile; eventTitle: string }>();

    for (const evt of events) {
      if (evt.attendees) {
        for (const attendeeId of evt.attendees) {
          if (attendeeId !== currentUser.id && !map.has(attendeeId)) {
            const prof = profiles.find((p) => p.id === attendeeId);
            if (prof) {
              map.set(attendeeId, { profile: prof, eventTitle: evt.title });
            }
          }
        }
      }
    }
    return Array.from(map.values());
  }, [profiles, currentUser.id]);

  const isWeb = layout === 'web';

  // Card front stays scannable: top shared hobbies + top 1–2 career overlaps
  const cardHobbies = sharedHobbies.slice(0, 3);
  const cardCompanyBadges = companyBadges.slice(0, 2);
  const cardTargetingBadges = targetingBadges.slice(0, Math.max(0, 2 - cardCompanyBadges.length));
  const hasCardOverlap = cardHobbies.length + cardCompanyBadges.length + cardTargetingBadges.length > 0;

  // Candidate's own intents (max 2 on the card); the ones that complement mine come first
  const complementOfMine = new Set((currentCandidate?.mutualIntents ?? []).map((i) => INTENT_CATALOG[i].complement));
  const allCardIntents = (currentCandidate?.intents ?? [])
    .map((id) => ({ id, mutual: complementOfMine.has(id) }))
    .sort((a, b) => Number(b.mutual) - Number(a.mutual));
  // Gold tags on the photo = only the intents that match mine (full list lives in the profile sheet)
  const cardIntents = allCardIntents.filter(({ mutual }) => mutual);

  const matchMutualIntents = matchedProfile ? getMutualIntents(currentUser, matchedProfile) : [];

  // Native <select> (best on phones) styled as a pill; gold when narrowing the deck
  const selectWrap = (active: boolean) =>
    `relative flex items-center gap-1 min-h-[40px] pl-3 pr-2.5 rounded-xl border text-xs transition focus-within:ring-1 focus-within:ring-[#B39051] ${
      active ? 'border-[#B39051] bg-tp-elevated text-tp-accent' : 'border-[#B39051]/35 bg-tp-surface text-tp-muted'
    }`;
  const selectClass =
    'appearance-none bg-transparent w-full min-w-0 pr-1 font-semibold text-tp-ink outline-none cursor-pointer truncate [&>option]:bg-tp-surface [&>optgroup]:bg-tp-surface';

  return (
    <div
      data-testid="swipe-radar-view"
      className={
        isWeb
          ? 'max-w-6xl mx-auto px-6 py-6 grid grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-8 items-start font-sans'
          : 'h-full max-w-md mx-auto px-3 pt-3 pb-1 flex flex-col gap-2.5 font-sans'
      }
    >
      <div className={isWeb ? 'space-y-4 w-full' : 'contents'}>
      {/* 1. Open to Meet status (compact single row) */}
      <div className="shrink-0 bg-tp-surface border border-[#B39051]/35 rounded-2xl pl-3 pr-1.5 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
              currentUser.isOpenToMeet ? 'bg-emerald-400 animate-pulse' : 'bg-tp-subtle'
            }`}
          />
          <p className="text-xs text-tp-muted truncate">
            <span className="font-bold text-tp-ink">{currentUser.isOpenToMeet ? 'Open to Meet' : 'Not visible'}</span>
            {' · '}
            {currentUser.isOpenToMeet && currentUser.openToMeetExpiresAt
              ? `Expires in ${formatTtlRemaining(currentUser.openToMeetExpiresAt)}`
              : 'Go live to get meetup invites'}
          </p>
        </div>

        <button
          onClick={() => setShowTtlModal(true)}
          className="shrink-0 px-3 min-h-[36px] rounded-xl text-xs font-bold bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] transition"
        >
          {currentUser.isOpenToMeet ? 'Change' : 'Go Live'}
        </button>
      </div>

      {/* 2. Deck selector: clean, bold labels only */}
      <div role="tablist" aria-label="Swipe deck" className="shrink-0 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-tp-surface border border-[#B39051]/35">
        {(
          [
            { id: 'radar', label: 'One-on-One Radar', count: filteredProfiles.length },
            { id: 'reconnect', label: 'Reconnect Deck', count: reconnectAttendees.length },
          ] as const
        ).map(({ id, label, count }) => {
          const active = activeDeck === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`deck-tab-${id}`}
              onClick={() => setActiveDeck(id)}
              className={`min-h-[44px] rounded-xl text-sm font-black transition ${
                active ? 'bg-[#B39051] text-[#051E39] shadow' : 'text-tp-muted hover:text-tp-ink'
              }`}
            >
              {label} <span className={active ? 'font-bold opacity-75' : 'font-semibold opacity-70'}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* RADAR DECK VIEW */}
      {activeDeck === 'radar' && (
        <>
          <div data-testid="deck-heading-radar" className="shrink-0 px-1 [@media(max-height:700px)]:hidden md:[@media(max-height:700px)]:block">
            <h3 className="text-sm font-black text-tp-ink">One-on-One Radar</h3>
            <p className="text-[11px] text-tp-muted">
              {currentCandidate
                ? `Profile ${currentIndex + 1} of ${filteredProfiles.length}`
                : 'Meet Yellow Jackets who are open to meet'}
            </p>
          </div>

          {/* Filters: two compact dropdowns (who + role) */}
          <div className="shrink-0 grid grid-cols-[1fr_auto] gap-2">
            <label className={selectWrap(intentFilter !== 'all')}>
              <span className="sr-only">Show</span>
              <select
                data-testid="intent-filter"
                value={intentFilter}
                onChange={(e) => {
                  setIntentFilter(e.target.value as IntentFilter);
                  setCurrentIndex(0);
                }}
                className={selectClass}
              >
                <option value="for-you">For You</option>
                <option value="all">Everyone</option>
                <optgroup label="Looking for…">
                  {INTENT_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {INTENT_CATALOG[id].filterLabel}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown aria-hidden="true" className="w-4 h-4 shrink-0 pointer-events-none" />
            </label>
            <label className={selectWrap(roleFilter !== 'all')}>
              <span className="sr-only">Role</span>
              <select
                data-testid="role-filter"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as 'all' | 'student' | 'alumni');
                  setCurrentIndex(0);
                }}
                className={selectClass}
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="alumni">Alumni</option>
              </select>
              <ChevronDown aria-hidden="true" className="w-4 h-4 shrink-0 pointer-events-none" />
            </label>
          </div>

          {/* Card Stack Area */}
          <div className={isWeb ? 'relative' : 'relative flex-1 min-h-0 flex flex-col'}>
            {currentCandidate ? (
              <div className={isWeb ? 'w-full relative' : 'relative flex-1 min-h-0 flex flex-col'}>
                {/* Visual Stack Shadow Behind */}
                {filteredProfiles[currentIndex + 1] && (
                  <div className="absolute inset-x-2 top-2 bottom-0 bg-tp-surface/40 rounded-3xl border border-[#B39051]/35 -z-10 transform scale-[0.96] translate-y-2 pointer-events-none" />
                )}

                {/* Current profile card (Pass / Connect via the buttons below) */}
                <div
                  key={currentCandidate.id}
                  data-testid="swipe-card"
                  className={`relative bg-tp-surface border-2 border-[#B39051]/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col ${
                    isWeb ? '' : 'flex-1 min-h-[340px]'
                  }`}
                >

                  {/* Photo with name, class / major and current role */}
                  <div className={`relative w-full bg-[#051E39] tp-on-navy ${isWeb ? 'h-80' : 'flex-1 min-h-[150px]'}`}>
                    <img
                      src={currentCandidate.avatarUrl}
                      alt={currentCandidate.name}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#051E39] via-[#051E39]/10 to-transparent" />

                    <div className="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 max-w-[75%] bg-[#051E39]/85 backdrop-blur-md border border-[#B39051]/50 text-tp-ink px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-tp-accent shrink-0" />
                        <span className="truncate">{currentCandidate.neighborhoodZone}</span>
                        {currentCandidate.distanceText && (
                          <span className="text-tp-accent font-bold shrink-0">· {currentCandidate.distanceText}</span>
                        )}
                      </div>
                      {currentCandidate.isOpenToMeet && (
                        <span className="shrink-0 bg-emerald-500/90 text-white text-[10px] font-extrabold uppercase px-2 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          Open
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black text-tp-ink tracking-tight drop-shadow truncate">
                          {currentCandidate.name}
                          <span className="ml-2 align-middle text-xs font-bold text-tp-accent">
                            '{currentCandidate.gradYear.toString().slice(-2)}
                          </span>
                        </h3>
                        <p className="text-xs text-tp-ink/90 font-semibold drop-shadow truncate">
                          {currentCandidate.major}
                        </p>
                        {currentCandidate.companyOrLab && (
                          <p className="text-[11px] text-tp-muted drop-shadow truncate">{currentCandidate.companyOrLab}</p>
                        )}
                      </div>
                      {cardIntents.length > 0 && (
                        <div
                          className="flex flex-wrap justify-end gap-1 shrink-0 max-w-[50%]"
                          data-testid="candidate-intents"
                        >
                          {cardIntents.map(({ id }) => (
                            <span
                              key={id}
                              data-mutual
                              className="text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wide bg-[#B39051] text-[#051E39]"
                            >
                              {INTENT_CATALOG[id].badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overlap at a glance */}
                  <div className="shrink-0 px-3 pt-2.5 pb-1 space-y-1.5">
                    {currentCandidate.mutualIntents.length > 0 && (
                      <p data-testid="mutual-intent-reason" className="text-[11px] font-semibold text-tp-accent truncate">
                        <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" />
                        {describeMutualIntent(currentCandidate.mutualIntents[0], currentCandidate.name.split(' ')[0])}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-hidden" data-testid="swipe-overlap-badges">
                      {cardCompanyBadges.map((badge) => (
                        <span
                          key={badge.label}
                          data-testid="career-overlap-badge"
                          className="text-[11px] px-2 py-1 rounded-lg font-black bg-[#B39051] text-[#051E39]"
                        >
                          <Briefcase className="inline w-3 h-3 mr-1 -mt-0.5" />
                          {badge.label}
                        </span>
                      ))}
                      {cardTargetingBadges.map((badge) => (
                        <span
                          key={badge.label}
                          data-testid="targeting-pill"
                          className="text-[11px] px-2 py-1 rounded-lg font-semibold bg-[#B39051]/15 text-tp-accent border border-[#B39051]/50"
                        >
                          <Target className="inline w-3 h-3 mr-1 -mt-0.5" />
                          {badge.label}
                        </span>
                      ))}
                      {cardHobbies.map((hobby) => (
                        <span
                          key={hobby}
                          data-shared
                          className="text-[11px] px-2 py-1 rounded-lg font-bold bg-tp-elevated text-tp-ink border border-[#B39051]/50"
                        >
                          {hobby}
                        </span>
                      ))}
                      {!hasCardOverlap && (
                        <span className="text-[11px] text-tp-subtle py-1">No overlap yet. A chance to meet someone new.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      data-testid="open-full-profile"
                      onClick={() => setIsFullProfileOpen(true)}
                      className="w-full min-h-[32px] flex items-center justify-center gap-1 text-[11px] font-bold text-tp-accent hover:underline"
                    >
                      Tap for full profile
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Bar (Pass / Super Connect / Connect) */}
                  <div className="shrink-0 px-3 py-2.5 bg-tp-canvas border-t border-[#B39051]/35 flex items-center gap-3">
                    <button
                      onClick={handlePass}
                      aria-label="Pass"
                      className="w-12 h-12 shrink-0 rounded-full bg-tp-elevated border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white transition flex items-center justify-center shadow-md"
                      title="Pass"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleConnect(currentCandidate, true)}
                      aria-label="Super Connect"
                      className="w-11 h-11 shrink-0 rounded-full bg-[#051E39] tp-on-navy border border-[#B39051] text-tp-accent hover:bg-[#B39051] hover:text-[#051E39] transition flex items-center justify-center shadow-md"
                      title="Super Connect"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      onClick={() => handleConnect(currentCandidate, false)}
                      aria-label="Connect"
                      className="flex-1 min-h-[48px] px-4 rounded-2xl bg-[#B39051] text-[#051E39] font-bold text-sm hover:bg-[#8F713D] active:bg-[#8F713D] transition flex items-center justify-center gap-2 shadow-lg"
                      title="Connect & Meet"
                    >
                      <Handshake className="w-4 h-4" />
                      <span>Connect</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Deck State */
              <div className="text-center p-8 bg-tp-surface rounded-3xl border border-[#B39051]/35 w-full space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#051E39] tp-on-navy border border-[#B39051] flex items-center justify-center text-tp-accent">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-tp-ink">You're All Caught Up!</h3>
                  <p className="text-xs text-tp-muted mt-1 max-w-xs mx-auto">
                    You've reviewed all available Yellow Jackets in your radar for now.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2 max-w-xs mx-auto">
                  <button
                    onClick={() => setCurrentIndex(0)}
                    className="py-2.5 px-4 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition"
                  >
                    <RotateCcw className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Review Profiles Again
                  </button>
                  {onNavigateToPlans && (
                    <button
                      onClick={onNavigateToPlans}
                      className="py-2.5 px-4 rounded-xl border border-[#B39051]/50 bg-[#051E39] tp-on-navy text-tp-ink font-semibold text-xs hover:bg-tp-elevated transition"
                    >
                      View Confirmed Plans
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* RE-CONNECT ATTENDEE DECK VIEW */}
      {activeDeck === 'reconnect' && (
        <div className={isWeb ? 'space-y-3' : 'flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2.5 pb-2'}>
          <div data-testid="deck-heading-reconnect" className="px-1">
            <h3 className="text-sm font-black text-tp-ink">Reconnect Deck</h3>
            <p className="text-[11px] font-semibold text-tp-accent">Post-Event Attendee Networking</p>
            <p className="text-[11px] text-tp-muted">
              Catch up one-on-one with students and alumni from recent campus pop-ups.
            </p>
          </div>

          {reconnectAttendees.length === 0 ? (
            <div className="text-center p-8 bg-tp-surface rounded-3xl border border-[#B39051]/35 space-y-3">
              <p className="text-xs text-tp-muted">No recent event attendees to reconnect with yet.</p>
              {onNavigateToMap && (
                <button
                  onClick={onNavigateToMap}
                  className="px-4 py-2 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition"
                >
                  Join Pop-Up Events
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {reconnectAttendees.map(({ profile, eventTitle }) => {
                const partnerShared = profile.hobbies.filter((h) =>
                  currentUser.hobbies?.some((myH) => myH.toLowerCase() === h.toLowerCase())
                );
                return (
                  <div
                    key={profile.id}
                    className="bg-tp-surface border border-[#B39051]/35 rounded-2xl p-3.5 shadow-md flex items-center justify-between gap-3 hover:border-[#B39051]/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#B39051] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-tp-ink text-sm truncate">
                            {profile.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#8F713D] text-white">
                            {profile.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-tp-accent truncate">
                          Attended: {eventTitle}
                        </p>
                        <p className="text-[11px] text-tp-muted truncate">
                          {profile.companyOrLab || profile.major}
                        </p>
                        {partnerShared.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {partnerShared.slice(0, 2).map((h) => (
                              <span
                                key={h}
                                className="text-[9px] bg-[#B39051]/20 text-tp-accent px-1.5 py-0.2 rounded"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setChatPartner(profile)}
                      className="py-2 px-3 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition shrink-0 shadow"
                    >
                      <MessageCircle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                      Message
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      </div>

      {isWeb && (
        <MatchBreakdownCard
          candidate={activeDeck === 'radar' ? currentCandidate : null}
          viewer={currentUser}
        />
      )}

      {/* 3. 'Open to Meet' TTL Selector Modal (bottom sheet on phones) */}
      {showTtlModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="tp-sheet-backdrop"
          onClick={() => setShowTtlModal(false)}
        >
          <div
            className="tp-sheet md:max-w-sm bg-tp-surface border-t md:border border-[#B39051]/50 px-5 pt-2 pb-5 md:p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <SheetDragHandle onClose={() => setShowTtlModal(false)} className="!pb-0" />
            <div className="flex items-center justify-between border-b border-[#B39051]/35 pb-3">
              <h3 className="font-bold text-tp-ink text-base">How long should you stay visible?</h3>
              <button
                onClick={() => setShowTtlModal(false)}
                aria-label="Close"
                className="text-tp-subtle hover:text-tp-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-tp-muted">
              While you're Open to Meet, nearby Yellow Jackets can invite you to a coffee chat. It turns off automatically when time's up.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {OPEN_TO_MEET_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSetTtl(opt.hours)}
                  className="py-2.5 px-3 rounded-xl border border-[#B39051]/35 bg-tp-canvas text-tp-ink hover:border-[#B39051] hover:text-tp-accent font-semibold text-xs transition text-center"
                >
                  <span className="block">{opt.label}</span>
                  <span className="block text-[10px] font-medium text-tp-subtle">{opt.hint}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#B39051]/35 flex gap-2">
              <button
                type="button"
                onClick={() => handleSetTtl(null)}
                className="flex-1 py-2 rounded-xl border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition"
              >
                Turn Off (Pause)
              </button>
              <button
                type="button"
                onClick={() => setShowTtlModal(false)}
                className="py-2 px-4 rounded-xl bg-tp-elevated text-tp-muted text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. "Tap for full profile" sheet: everything that doesn't fit on the card front */}
      {isFullProfileOpen && currentCandidate && (
        <div className="tp-sheet-backdrop" onClick={() => setIsFullProfileOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${currentCandidate.name} full profile`}
            data-testid="full-profile-sheet"
            className="tp-sheet md:max-w-md bg-tp-surface border-t md:border border-[#B39051]/50 px-5 pt-2 pb-5 md:p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <SheetDragHandle onClose={() => setIsFullProfileOpen(false)} className="!pb-0" />

            <div className="flex items-center gap-3">
              <img
                src={currentCandidate.avatarUrl}
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-[#B39051] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-tp-ink truncate">
                  {currentCandidate.name}{' '}
                  <span className="text-xs font-bold text-tp-accent">'{currentCandidate.gradYear.toString().slice(-2)}</span>
                </h3>
                <p className="text-xs text-tp-muted truncate">
                  <span className="capitalize">{currentCandidate.role}</span> · {currentCandidate.major}
                </p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified{currentCandidate.vouchesCount ? ` · ${currentCandidate.vouchesCount} vouches` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFullProfileOpen(false)}
                aria-label="Close full profile"
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-tp-subtle hover:text-tp-ink hover:bg-tp-ink/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-tp-muted flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-tp-accent" />
              {currentCandidate.neighborhoodZone}
              {currentCandidate.distanceText ? ` · ${currentCandidate.distanceText}` : ''}
            </p>

            <p className="text-sm text-tp-ink leading-relaxed">{currentCandidate.bio}</p>

            <section className="space-y-1.5" data-testid="full-profile-intents">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-tp-accent">Looking for</h4>
              {allCardIntents.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allCardIntents.map(({ id, mutual }) => (
                    <span
                      key={id}
                      data-mutual={mutual || undefined}
                      className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${
                        mutual
                          ? 'bg-[#B39051] text-[#051E39]'
                          : 'bg-tp-elevated text-tp-muted border border-tp-line'
                      }`}
                    >
                      {INTENT_CATALOG[id].label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-tp-subtle">Open to anything.</p>
              )}
            </section>

            <section className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-tp-accent">Hobbies</h4>
              <div className="flex flex-wrap gap-1.5">
                {currentCandidate.hobbies.map((hobby) => {
                  const isShared = sharedHobbies.some((h) => h.toLowerCase() === hobby.toLowerCase());
                  return (
                    <span
                      key={hobby}
                      className={`text-xs px-2.5 py-1 rounded-lg ${
                        isShared
                          ? 'bg-[#B39051] text-[#051E39] font-bold'
                          : 'bg-tp-elevated text-tp-muted border border-[#B39051]/35'
                      }`}
                    >
                      {isShared && <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" />}
                      {hobby}
                    </span>
                  );
                })}
              </div>
            </section>

            {currentCandidate.careerBadges.length > 0 && (
              <section className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-tp-accent">Career overlap</h4>
                <div className="flex flex-wrap gap-1.5">
                  {currentCandidate.careerBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className={`text-[11px] px-2 py-1 rounded-lg ${
                        badge.kind === 'works-at' || badge.kind === 'ex-company'
                          ? 'bg-[#B39051] text-[#051E39] font-black'
                          : 'bg-[#B39051]/15 text-tp-accent border border-[#B39051]/50 font-semibold'
                      }`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {currentCandidate.workHistory.length > 0 && (
              <section className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-tp-accent">Experience</h4>
                <ul className="space-y-1">
                  {currentCandidate.workHistory.map((exp, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-xl bg-tp-elevated">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Briefcase className="w-3.5 h-3.5 text-tp-accent shrink-0" />
                        <span className="truncate">
                          <strong className="text-tp-ink">{exp.company}</strong>
                          <span className="text-tp-muted"> · {exp.role}</span>
                        </span>
                      </span>
                      <span className="text-[10px] text-tp-subtle shrink-0">{exp.period}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(currentCandidate.targetRoles.length > 0 || currentCandidate.targetCompanies.length > 0) && (
              <section className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-tp-accent">Looking for</h4>
                <p className="text-xs text-tp-muted">
                  {currentCandidate.targetRoles.join(', ')}
                  {currentCandidate.targetCompanies.length > 0 && ` at ${currentCandidate.targetCompanies.join(', ')}`}
                </p>
              </section>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsFullProfileOpen(false);
                  handlePass();
                }}
                className="px-4 min-h-[48px] rounded-xl border border-red-500/40 text-red-400 text-sm font-bold hover:bg-red-500/10"
              >
                Pass
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullProfileOpen(false);
                  handleConnect(currentCandidate, false);
                }}
                className="flex-1 min-h-[48px] rounded-xl bg-[#B39051] text-[#051E39] text-sm font-black hover:bg-[#8F713D] active:bg-[#8F713D] transition flex items-center justify-center gap-2"
              >
                <Handshake className="w-4 h-4" />
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Double Opt-In Match Modal */}
      {showMatchModal && matchedProfile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95"
        >
          <div className="w-full max-w-sm bg-[#051E39] tp-on-navy border-2 border-[#B39051] rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <PartyPopper className="w-10 h-10 mx-auto text-tp-accent animate-bounce" />

            <div>
              <h3 className="text-xl font-black text-tp-ink tracking-tight">
                It's a Mutual Match!
              </h3>
              {matchMutualIntents.length > 0 ? (
                <ul data-testid="match-mutual-intents" className="text-xs text-tp-muted mt-1 space-y-0.5">
                  {matchMutualIntents.map((i) => (
                    <li key={i}>{describeMutualIntent(i, matchedProfile.name.split(' ')[0])}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-tp-muted mt-1">
                  You and {matchedProfile.name} can now message each other.
                </p>
              )}
            </div>

            {/* Avatars side-by-side */}
            <div className="flex items-center justify-center gap-3 py-2">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#B39051] shadow-md"
              />
              <div className="w-8 h-8 rounded-full bg-[#B39051] text-[#051E39] flex items-center justify-center shadow">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <img
                src={matchedProfile.avatarUrl}
                alt={matchedProfile.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#B39051] shadow-md"
              />
            </div>

            {/* Shared Context */}
            <div className="bg-tp-surface p-3 rounded-xl border border-[#B39051]/35 text-xs text-left space-y-1">
              <div className="flex items-center justify-between text-tp-muted">
                <span>{matchedProfile.name}</span>
                <span className="text-tp-accent font-semibold">
                  {matchedProfile.companyOrLab || matchedProfile.major}
                </span>
              </div>
              {matchedProfile.hobbies.filter((h) => currentUser.hobbies.includes(h)).length > 0 && (
                <p className="text-[11px] text-tp-muted pt-1">
                  Shared: {matchedProfile.hobbies.filter((h) => currentUser.hobbies.includes(h)).join(', ')}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowMatchModal(false);
                  setChatPartner(matchedProfile);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send a Message</span>
              </button>


              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                className="w-full py-2 text-xs text-tp-muted hover:text-tp-ink"
              >
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Chat Drawer */}
      <ChatDrawer
        isOpen={!!chatPartner}
        onClose={() => setChatPartner(null)}
        partner={chatPartner}
        onScheduled={() => loadData()}
      />
    </div>
  );
};
