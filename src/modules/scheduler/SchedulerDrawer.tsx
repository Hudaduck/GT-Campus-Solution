import React, { useState, useEffect } from 'react';
import { X, Coffee, CalendarPlus, Check, MapPin, Video } from 'lucide-react';
import {
  UserProfile,
  CalendarMeetup,
  CoffeeSpotSuggestion,
  MeetingFormat,
  OnlinePlatform,
} from '../../shared/contracts';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { Repository, MIDPOINT_COFFEE_SPOTS, sanitizeMeetingLink } from '../../shared/data/repository';
import { generateIcsFile, generateGoogleCalendarUrl, downloadIcsFile, formatDuration } from './calendarUtils';

const DEFAULT_LENGTH_MIN = 45;
const MAX_LENGTH_MIN = 8 * 60;
const addMinutes = (d: Date, min: number) => new Date(d.getTime() + min * 60 * 1000);
import { intentLabels } from '../../shared/intents';
import { defaultStart, fromInputs, startError, toDateInput, toTimeInput } from '../../shared/schedule';

export const ONLINE_PLATFORMS: OnlinePlatform[] = ['Google Meet', 'Zoom', 'Microsoft Teams', 'Phone Call'];

interface SchedulerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partner: UserProfile | null;
  matchId?: string;
  onScheduled?: (meetup: CalendarMeetup) => void;
  initialSpot?: CoffeeSpotSuggestion;
  initialFormat?: MeetingFormat;
  /** Reschedule: pre-fill from this meetup and replace it on confirm */
  existingMeetup?: CalendarMeetup | null;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const SchedulerDrawer: React.FC<SchedulerDrawerProps> = ({
  isOpen,
  onClose,
  partner,
  matchId,
  onScheduled,
  initialSpot,
  initialFormat = 'in-person',
  existingMeetup = null,
}) => {
  const isReschedule = !!existingMeetup;
  const [format, setFormat] = useState<MeetingFormat>(initialFormat);
  const [platform, setPlatform] = useState<OnlinePlatform>('Google Meet');
  const [meetingLinkInput, setMeetingLinkInput] = useState<string>('');
  const [useCustomSpot, setUseCustomSpot] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [selectedSpot, setSelectedSpot] = useState<CoffeeSpotSuggestion>(
    initialSpot || MIDPOINT_COFFEE_SPOTS[0]
  );
  // Plain date + time (default ~2h out, 9 AM-8 PM); availability is agreed in chat first
  const [startDate, setStartDate] = useState<string>(() => toDateInput(defaultStart()));
  const [startClock, setStartClock] = useState<string>(() => toTimeInput(defaultStart()));
  const [endClock, setEndClock] = useState<string>(() => toTimeInput(addMinutes(defaultStart(), DEFAULT_LENGTH_MIN)));
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [scheduledMeetup, setScheduledMeetup] = useState<CalendarMeetup | null>(null);


  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setScheduledMeetup(null);
      setFormat(initialFormat);
      setMeetingLinkInput('');
      setUseCustomSpot(false);
      setCustomName('');
      setCustomAddress('');
      if (existingMeetup) {
        // Reschedule: start from the current plan
        const start = new Date(existingMeetup.scheduledTime);
        setStartDate(toDateInput(start));
        setStartClock(toTimeInput(start));
        setEndClock(toTimeInput(addMinutes(start, existingMeetup.durationMinutes)));
        setFormat(existingMeetup.format ?? 'in-person');
        if (existingMeetup.format === 'online') {
          if (existingMeetup.onlinePlatform) setPlatform(existingMeetup.onlinePlatform);
          setMeetingLinkInput(existingMeetup.meetingLink ?? '');
        } else {
          const spot = MIDPOINT_COFFEE_SPOTS.find((x) => x.name === existingMeetup.locationName);
          if (spot) {
            setSelectedSpot(spot);
          } else {
            setUseCustomSpot(true);
            setCustomName(existingMeetup.locationName === existingMeetup.locationAddress ? '' : existingMeetup.locationName);
            setCustomAddress(existingMeetup.locationAddress);
          }
        }
        return;
      }
      const start = defaultStart();
      setStartDate(toDateInput(start));
      setStartClock(toTimeInput(start));
      setEndClock(toTimeInput(addMinutes(start, DEFAULT_LENGTH_MIN)));
      if (initialSpot) {
        setSelectedSpot(initialSpot);
      } else {
        setSelectedSpot(MIDPOINT_COFFEE_SPOTS[0]);
      }
    }
  }, [isOpen, initialSpot, initialFormat, existingMeetup]);

  if (!isOpen || !partner) return null;

  const currentUser = Repository.getCurrentUser();
  const startAt = fromInputs(startDate, startClock);
  const endAt = fromInputs(startDate, endClock);
  const lengthMin = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  const timeError =
    startError(startAt) ??
    (Number.isNaN(endAt.getTime())
      ? 'Please pick an end time'
      : lengthMin <= 0
        ? 'End time must be after the start'
        : lengthMin > MAX_LENGTH_MIN
          ? 'Meetups can be up to 8 hours'
          : null);
  const selectedDuration = timeError ? DEFAULT_LENGTH_MIN : lengthMin;
  const effectiveMeetupTime = timeError ? '' : startAt.toISOString();
  const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Moving the start keeps the same length (like a calendar app)
  const shiftStart = (date: string, time: string) => {
    const keep = lengthMin > 0 && lengthMin <= MAX_LENGTH_MIN ? lengthMin : DEFAULT_LENGTH_MIN;
    setStartDate(date);
    setStartClock(time);
    const s = fromInputs(date, time);
    if (!Number.isNaN(s.getTime())) setEndClock(toTimeInput(addMinutes(s, keep)));
  };
  const today = new Date();
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const isOnline = format === 'online';
  const isPhone = platform === 'Phone Call';
  const meetingLink = isOnline && !isPhone ? sanitizeMeetingLink(meetingLinkInput) : undefined;
  const hasInvalidLink = isOnline && !isPhone && meetingLinkInput.trim() !== '' && !meetingLink;

  const isCustomSpot = !isOnline && useCustomSpot;
  const missingCustomAddress = isCustomSpot && customAddress.trim() === '';
  const cannotConfirm = hasInvalidLink || missingCustomAddress || timeError !== null;

  const locationName = isOnline
    ? platform
    : isCustomSpot
      ? customName.trim() || customAddress.trim()
      : selectedSpot.name;
  const locationAddress = isOnline
    ? meetingLink ?? (isPhone ? 'Swap numbers in chat' : 'Link to be shared in chat')
    : isCustomSpot
      ? customAddress.trim()
      : selectedSpot.address;

  const handleConfirmSchedule = () => {
    if (cannotConfirm) return;
    const kind = isOnline ? (isPhone ? 'Call' : 'Video Chat') : isCustomSpot ? 'Meetup' : 'Coffee';
    const meetupTitle = `ThirdPlace ${kind}: ${currentUser.name} & ${partner.name}`;
    const meetupDescription = `Georgia Tech 1-on-1 ${isOnline ? `${platform} meetup` : isCustomSpot ? 'In-Person Meetup' : 'Coffee Meetup'}.${
      meetingLink ? `\nJoin: ${meetingLink}` : ''
    }\nShared Hobbies: ${partner.hobbies.join(', ')}\nLooking for: ${intentLabels(partner.intents)}`;

    const icsContent = generateIcsFile({
      title: meetupTitle,
      description: meetupDescription,
      locationName,
      locationAddress,
      startTime: effectiveMeetupTime,
      durationMinutes: selectedDuration,
      partnerName: partner.name,
      partnerEmail: partner.email,
      userEmail: currentUser.email,
    });

    const googleCalUrl = generateGoogleCalendarUrl({
      title: meetupTitle,
      description: meetupDescription,
      locationName,
      locationAddress,
      startTime: effectiveMeetupTime,
      durationMinutes: selectedDuration,
      partnerName: partner.name,
      partnerEmail: partner.email,
    });

    const existingMatch =
      Repository.findMatchWith(currentUser.id, partner.id) ||
      (matchId ? Repository.getMatches().find((m) => m.id === matchId) : undefined);

    const newMeetup: CalendarMeetup = {
      id: existingMeetup?.id ?? `meetup_${Date.now()}`,
      ownerId: currentUser.id,
      matchId: existingMatch?.id || matchId || `match_${currentUser.id}_${partner.id}`,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerRole: partner.role,
      partnerAvatar: partner.avatarUrl,
      partnerMajorOrCompany: partner.companyOrLab || partner.major,
      format,
      onlinePlatform: isOnline ? platform : undefined,
      meetingLink,
      locationName,
      locationAddress,
      scheduledTime: effectiveMeetupTime,
      durationMinutes: selectedDuration,
      icsContent,
      googleCalendarUrl: googleCalUrl,
      status: 'confirmed',
      sharedHobbies: partner.hobbies.filter((h) => currentUser.hobbies.includes(h)),
    };

    // Save to repository
    Repository.saveScheduledMeetup(newMeetup);

    // Mark the match scheduled and leave a record of the plan in the chat thread
    if (existingMatch) {
      Repository.saveMatch({ ...existingMatch, status: 'scheduled' });
      const where = isOnline
        ? isPhone
          ? 'a phone call'
          : `a video call on ${platform}`
        : isCustomSpot
          ? `a meetup at ${locationName === locationAddress ? locationAddress : `${locationName} (${locationAddress})`}`
          : `coffee at ${selectedSpot.name}`;
      Repository.sendMessage(
        existingMatch.id,
        currentUser,
        `${isReschedule ? 'Rescheduled to' : 'Scheduled'} ${where} for ${formatWhen(effectiveMeetupTime)} (${formatDuration(selectedDuration)}).${
          meetingLink ? ` Join here: ${meetingLink}` : ''
        }`
      );
    }

    setScheduledMeetup(newMeetup);
    setIsSuccess(true);
    onScheduled?.(newMeetup);

    // Open the pre-filled Google Calendar event (must run inside the click so it isn't popup-blocked).
    // If the browser blocks it anyway, the success screen has an "Open in Google Calendar" button.
    try {
      window.open(googleCalUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore: environments without window.open
    }
  };

  const handleDownloadIcs = () => {
    if (scheduledMeetup?.icsContent) {
      downloadIcsFile(
        `ThirdPlace-${partner.name.replace(/\s+/g, '_')}-Meetup.ics`,
        scheduledMeetup.icsContent
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Post-Match Meetup Scheduler"
      className="tp-sheet-backdrop"
    >
      <div
        className="tp-sheet md:max-w-lg bg-tp-surface border-t md:border border-[#B39051]/35 flex flex-col !overflow-hidden"
      >
        <div className="bg-[#051E39] tp-on-navy pt-2">
          <SheetDragHandle onClose={onClose} className="!pb-1" />
        </div>
        {/* Header */}
        <div className="bg-[#051E39] tp-on-navy px-5 py-4 border-b border-[#B39051]/35 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={partner.avatarUrl}
              alt={partner.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#B39051]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-tp-ink text-base">{partner.name}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#B39051] text-[#051E39]">
                  {partner.role}
                </span>
              </div>
              <p className="text-xs text-tp-muted">
                {partner.companyOrLab || partner.major} • {partner.neighborhoodZone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scheduler"
            className="text-tp-subtle hover:text-tp-ink p-1.5 rounded-lg hover:bg-tp-ink/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto min-h-0 flex-1 space-y-5 text-sm">
          {isSuccess && scheduledMeetup ? (
            /* Success State */
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#B39051]/20 border-2 border-[#B39051] flex items-center justify-center text-tp-accent">
                {scheduledMeetup.format === 'online' ? <Video className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-lg font-bold text-tp-ink">{isReschedule ? 'Meetup Rescheduled!' : 'Meetup Confirmed!'}</h4>
                <p className="text-xs text-tp-muted mt-1">
                  Finish adding it in the Google Calendar tab that just opened.
                </p>
              </div>

              <div className="bg-tp-elevated p-4 rounded-xl border border-[#B39051]/35 text-left space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-tp-muted">{scheduledMeetup.format === 'online' ? 'Online' : 'Spot'}</span>
                  <span className="text-xs font-semibold text-tp-ink">{scheduledMeetup.locationName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-tp-muted">{scheduledMeetup.format === 'online' ? 'Link' : 'Address'}</span>
                  {scheduledMeetup.meetingLink ? (
                    <a
                      href={scheduledMeetup.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tp-accent underline truncate"
                    >
                      {scheduledMeetup.meetingLink}
                    </a>
                  ) : (
                    <span className="text-xs text-tp-muted">{scheduledMeetup.locationAddress}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-tp-muted">When</span>
                  <span className="text-xs font-semibold text-tp-accent">
                    {formatWhen(scheduledMeetup.scheduledTime)} ({formatDuration(scheduledMeetup.durationMinutes)})
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {scheduledMeetup.googleCalendarUrl && (
                  <a
                    href={scheduledMeetup.googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="open-google-calendar"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#8F713D] active:bg-[#8F713D] transition shadow-md"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Open in Google Calendar</span>
                  </a>
                )}
                <button
                  onClick={handleDownloadIcs}
                  className="w-full text-[11px] text-tp-subtle hover:text-tp-ink underline"
                >
                  Using another calendar? Download .ics
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full text-center text-xs text-tp-subtle hover:text-tp-ink pt-2"
              >
                Back to ThirdPlace
              </button>
            </div>
          ) : (
            /* Scheduler Form */
            <>
              {/* Step 1: In person or online */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#B39051] text-[#051E39] inline-flex items-center justify-center text-[11px] font-extrabold">
                    1
                  </span>
                  <span>How do you want to meet?</span>
                </label>
                <div role="radiogroup" aria-label="Meeting format" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: 'in-person', label: 'In person', Icon: MapPin },
                      { value: 'online', label: 'Online', Icon: Video },
                    ] as const
                  ).map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={format === value}
                      data-testid={`format-${value}`}
                      onClick={() => setFormat(value)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                        format === value
                          ? 'bg-tp-elevated border-[#B39051] text-tp-accent ring-1 ring-[#B39051]'
                          : 'bg-tp-canvas/60 border-[#B39051]/35 text-tp-muted hover:border-[#B39051]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isOnline ? (
              /* Step 2 (online): platform + optional link */
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#B39051] text-[#051E39] inline-flex items-center justify-center text-[11px] font-extrabold">
                    2
                  </span>
                  <span>Choose Platform</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ONLINE_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={platform === p}
                      onClick={() => setPlatform(p)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                        platform === p
                          ? 'bg-tp-elevated border-[#B39051] text-tp-accent shadow-sm'
                          : 'bg-tp-canvas/60 border-[#B39051]/35 text-tp-muted hover:border-[#B39051]/50'
                      }`}
                    >
                      {p}
                      {platform === p && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
                {!isPhone && (
                  <div className="mt-2.5">
                    <label htmlFor="meeting-link" className="text-[11px] text-tp-subtle block mb-1">
                      Meeting link (optional, or share it in chat later):
                    </label>
                    <input
                      id="meeting-link"
                      type="url"
                      inputMode="url"
                      placeholder={`Paste your ${platform} link`}
                      value={meetingLinkInput}
                      onChange={(e) => setMeetingLinkInput(e.target.value)}
                      aria-invalid={hasInvalidLink}
                      className={`w-full bg-tp-canvas border rounded-xl px-3 py-1.5 text-xs text-tp-ink focus:outline-none ${
                        hasInvalidLink ? 'border-red-400' : 'border-[#B39051]/35 focus:border-[#B39051]'
                      }`}
                    />
                    {hasInvalidLink && (
                      <p className="text-[11px] text-red-400 mt-1">Enter a valid http(s) link.</p>
                    )}
                  </div>
                )}
              </div>
              ) : (
              /* Step 2 (in person): Select Midpoint Coffee Spot */
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#B39051] text-[#051E39] inline-flex items-center justify-center text-[11px] font-extrabold">
                      2
                    </span>
                    <span>Recommended Spots</span>
                  </label>
                  <span className="text-[11px] text-tp-subtle">GT Campus & Midtown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MIDPOINT_COFFEE_SPOTS.map((spot) => {
                    const isSelected = !useCustomSpot && selectedSpot.name === spot.name;
                    return (
                      <button
                        key={spot.name}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedSpot(spot);
                          setUseCustomSpot(false);
                        }}
                        className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-tp-elevated border-[#B39051] shadow-md ring-1 ring-[#B39051]'
                            : 'bg-tp-canvas/60 border-[#B39051]/35 hover:border-[#B39051]/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h5 className="font-semibold text-tp-ink text-xs leading-tight">
                              {spot.name}
                            </h5>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-tp-accent" />
                            )}
                          </div>
                          <p className="text-[11px] text-tp-accent mt-0.5">
                            {spot.neighborhood}
                          </p>
                        </div>
                        <p className="text-[10px] text-tp-muted mt-2 line-clamp-2">
                          {spot.perk}
                        </p>
                      </button>
                    );
                  })}

                  {/* Anywhere else the two of them agreed on in chat */}
                  <button
                    type="button"
                    data-testid="spot-custom"
                    aria-pressed={useCustomSpot}
                    onClick={() => setUseCustomSpot(true)}
                    className={`p-3 rounded-xl text-left border border-dashed transition flex flex-col justify-between sm:col-span-2 ${
                      useCustomSpot
                        ? 'bg-tp-elevated border-[#B39051] shadow-md ring-1 ring-[#B39051]'
                        : 'bg-tp-canvas/60 border-[#B39051]/50 hover:border-[#B39051]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-tp-ink text-xs leading-tight flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-tp-accent" />
                        Somewhere else
                      </h5>
                      {useCustomSpot && <Check className="w-3.5 h-3.5 text-tp-accent" />}
                    </div>
                    <p className="text-[10px] text-tp-muted mt-1">Enter your own place and address</p>
                  </button>
                </div>

                {useCustomSpot && (
                  <div className="mt-2.5 space-y-2">
                    <div>
                      <label htmlFor="custom-place-name" className="text-[11px] text-tp-subtle block mb-1">
                        Place name (optional)
                      </label>
                      <input
                        id="custom-place-name"
                        placeholder="e.g. Piedmont Park, Ponce City Market"
                        value={customName}
                        maxLength={120}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-1.5 text-xs text-tp-ink focus:outline-none focus:border-[#B39051]"
                      />
                    </div>
                    <div>
                      <label htmlFor="custom-place-address" className="text-[11px] text-tp-subtle block mb-1">
                        Address
                      </label>
                      <input
                        id="custom-place-address"
                        placeholder="Street, city"
                        autoComplete="street-address"
                        value={customAddress}
                        maxLength={200}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        aria-invalid={missingCustomAddress}
                        className="w-full bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-1.5 text-xs text-tp-ink focus:outline-none focus:border-[#B39051]"
                      />
                      {missingCustomAddress && (
                        <p className="text-[11px] text-tp-subtle mt-1">Add an address to confirm.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Step 3: Select Time Slot & Duration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#B39051] text-[#051E39] inline-flex items-center justify-center text-[11px] font-extrabold">
                      3
                    </span>
                    <span>Pick a Time</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <input
                    type="date"
                    aria-label="Meetup date"
                    data-testid="meetup-date-input"
                    value={startDate}
                    min={toDateInput(today)}
                    max={toDateInput(maxDate)}
                    onChange={(e) => shiftStart(e.target.value, startClock)}
                    className="w-full bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-2 text-xs text-tp-ink focus:outline-none focus:border-[#B39051] [color-scheme:dark]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-tp-muted mb-1">Starts</span>
                      <input
                        type="time"
                        aria-label="Meetup start time"
                        data-testid="meetup-time-input"
                        value={startClock}
                        step={900}
                        onChange={(e) => shiftStart(startDate, e.target.value)}
                        className="w-full bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-2 text-xs text-tp-ink focus:outline-none focus:border-[#B39051] [color-scheme:dark]"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-tp-muted mb-1">Ends</span>
                      <input
                        type="time"
                        aria-label="Meetup end time"
                        data-testid="meetup-end-input"
                        value={endClock}
                        step={900}
                        onChange={(e) => setEndClock(e.target.value)}
                        className="w-full bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-2 text-xs text-tp-ink focus:outline-none focus:border-[#B39051] [color-scheme:dark]"
                      />
                    </label>
                  </div>
                </div>

                {timeError ? (
                  <p role="alert" className="text-[11px] text-red-400 mt-1.5">{timeError}</p>
                ) : (
                  <p data-testid="meetup-time-preview" className="text-[11px] text-tp-subtle mt-1.5">
                    {formatWhen(effectiveMeetupTime)} – {clock(endAt)} · {formatDuration(selectedDuration)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  disabled={cannotConfirm}
                  className="w-full py-3 px-4 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-sm tracking-wide hover:bg-[#8F713D] active:bg-[#8F713D] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOnline ? <Video className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                  <span>{isReschedule ? 'Reschedule & Update Google Calendar' : 'Confirm & Add to Google Calendar'}</span>
                </button>
                <p className="text-[11px] text-center text-tp-subtle">
                  {isReschedule
                    ? 'Opens the updated event in Google Calendar. Delete the old one there if it was saved.'
                    : `Opens a ready-to-save Google Calendar event with ${partner.name.split(' ')[0]} as a guest.`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
