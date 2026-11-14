import React, { useState, useEffect } from 'react';
import { X, Coffee, CalendarPlus, Check } from 'lucide-react';
import { UserProfile, CalendarMeetup, CoffeeSpotSuggestion } from '../../shared/contracts';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { Repository, MIDPOINT_COFFEE_SPOTS } from '../../shared/data/repository';
import { generateIcsFile, generateGoogleCalendarUrl, downloadIcsFile } from './calendarUtils';

interface SchedulerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partner: UserProfile | null;
  matchId?: string;
  onScheduled?: (meetup: CalendarMeetup) => void;
  initialSpot?: CoffeeSpotSuggestion;
}

export const SchedulerDrawer: React.FC<SchedulerDrawerProps> = ({
  isOpen,
  onClose,
  partner,
  matchId,
  onScheduled,
  initialSpot,
}) => {
  const [selectedSpot, setSelectedSpot] = useState<CoffeeSpotSuggestion>(
    initialSpot || MIDPOINT_COFFEE_SPOTS[0]
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(45); // in minutes
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [scheduledMeetup, setScheduledMeetup] = useState<CalendarMeetup | null>(null);

  // Generate 4 dynamic quick time slots based on current time
  const quickTimeSlots = React.useMemo(() => {
    const slots = [];
    const now = new Date();

    // Slot 1: Today later (e.g. 4:00 PM or +3 hours)
    const slot1 = new Date(now);
    slot1.setHours(slot1.getHours() + 3, 0, 0, 0);
    slots.push({
      label: `Today • ${slot1.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      date: slot1.toISOString(),
    });

    // Slot 2: Tomorrow morning (10:30 AM)
    const slot2 = new Date(now);
    slot2.setDate(slot2.getDate() + 1);
    slot2.setHours(10, 30, 0, 0);
    slots.push({
      label: `Tomorrow • 10:30 AM`,
      date: slot2.toISOString(),
    });

    // Slot 3: Tomorrow afternoon (3:30 PM)
    const slot3 = new Date(now);
    slot3.setDate(slot3.getDate() + 1);
    slot3.setHours(15, 30, 0, 0);
    slots.push({
      label: `Tomorrow • 3:30 PM`,
      date: slot3.toISOString(),
    });

    // Slot 4: 2 days later (2:00 PM)
    const slot4 = new Date(now);
    slot4.setDate(slot4.getDate() + 2);
    slot4.setHours(14, 0, 0, 0);
    const dayName = slot4.toLocaleDateString([], { weekday: 'short' });
    slots.push({
      label: `${dayName} • 2:00 PM`,
      date: slot4.toISOString(),
    });

    return slots;
  }, []);

  useEffect(() => {
    if (quickTimeSlots.length > 0 && !selectedTimeSlot) {
      setSelectedTimeSlot(quickTimeSlots[0].date);
    }
  }, [quickTimeSlots, selectedTimeSlot]);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setScheduledMeetup(null);
      if (initialSpot) {
        setSelectedSpot(initialSpot);
      } else {
        setSelectedSpot(MIDPOINT_COFFEE_SPOTS[0]);
      }
    }
  }, [isOpen, initialSpot]);

  if (!isOpen || !partner) return null;

  const currentUser = Repository.getCurrentUser();
  const effectiveMeetupTime = customDateTime
    ? new Date(customDateTime).toISOString()
    : selectedTimeSlot || quickTimeSlots[0].date;

  const handleConfirmSchedule = () => {
    const meetupTitle = `ThirdPlace Coffee: ${currentUser.name} & ${partner.name}`;
    const meetupDescription = `Georgia Tech 1-on-1 Coffee Meetup.\nShared Hobbies: ${partner.hobbies.join(', ')}\nIntent: ${partner.intent}`;

    const icsContent = generateIcsFile({
      title: meetupTitle,
      description: meetupDescription,
      locationName: selectedSpot.name,
      locationAddress: selectedSpot.address,
      startTime: effectiveMeetupTime,
      durationMinutes: selectedDuration,
      partnerName: partner.name,
      partnerEmail: partner.email,
      userEmail: currentUser.email,
    });

    const googleCalUrl = generateGoogleCalendarUrl({
      title: meetupTitle,
      description: meetupDescription,
      locationName: selectedSpot.name,
      locationAddress: selectedSpot.address,
      startTime: effectiveMeetupTime,
      durationMinutes: selectedDuration,
      partnerName: partner.name,
    });

    const newMeetup: CalendarMeetup = {
      id: `meetup_${Date.now()}`,
      matchId: matchId || `match_${currentUser.id}_${partner.id}`,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerRole: partner.role,
      partnerAvatar: partner.avatarUrl,
      partnerMajorOrCompany: partner.companyOrLab || partner.major,
      locationName: selectedSpot.name,
      locationAddress: selectedSpot.address,
      scheduledTime: effectiveMeetupTime,
      durationMinutes: selectedDuration,
      icsContent,
      googleCalendarUrl: googleCalUrl,
      status: 'confirmed',
      sharedHobbies: partner.hobbies.filter((h) => currentUser.hobbies.includes(h)),
    };

    // Save to repository
    Repository.saveScheduledMeetup(newMeetup);

    // Update match status to 'scheduled' if match exists
    const matches = Repository.getMatches();
    const existingMatch = matches.find(
      (m) =>
        (m.user1Id === partner.id && m.user2Id === currentUser.id) ||
        (m.user2Id === partner.id && m.user1Id === currentUser.id) ||
        m.id === matchId
    );
    if (existingMatch) {
      existingMatch.status = 'scheduled';
      Repository.saveMatch(existingMatch);
    }

    setScheduledMeetup(newMeetup);
    setIsSuccess(true);
    onScheduled?.(newMeetup);

    // Automatically trigger .ics download for seamless calendar sync
    downloadIcsFile(
      `ThirdPlace-${partner.name.replace(/\s+/g, '_')}-Meetup.ics`,
      icsContent
    );
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
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-tp-ink">Meetup Confirmed!</h4>
                <p className="text-xs text-tp-muted mt-1">
                  Calendar invite (.ics) has been generated and downloaded.
                </p>
              </div>

              <div className="bg-tp-elevated p-4 rounded-xl border border-[#B39051]/35 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tp-muted">Spot</span>
                  <span className="text-xs font-semibold text-tp-ink">{scheduledMeetup.locationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tp-muted">Address</span>
                  <span className="text-xs text-tp-muted">{scheduledMeetup.locationAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tp-muted">When</span>
                  <span className="text-xs font-semibold text-tp-accent">
                    {new Date(scheduledMeetup.scheduledTime).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })} ({scheduledMeetup.durationMinutes} min)
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {scheduledMeetup.googleCalendarUrl && (
                  <a
                    href={scheduledMeetup.googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#8F713D] active:bg-[#8F713D] transition shadow-md"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Open in Google Calendar</span>
                  </a>
                )}
                <button
                  onClick={handleDownloadIcs}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#B39051] bg-[#051E39] tp-on-navy text-tp-ink font-semibold text-xs hover:bg-tp-elevated transition"
                >
                  Download .ics File
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
            /* 2-Tap Scheduler Form */
            <>
              {/* Tap 1: Select Midpoint Coffee Spot */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#B39051] text-[#051E39] inline-flex items-center justify-center text-[11px] font-extrabold">
                      1
                    </span>
                    <span>Choose Midpoint Spot</span>
                  </label>
                  <span className="text-[11px] text-tp-subtle">GT Campus & Midtown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MIDPOINT_COFFEE_SPOTS.map((spot) => {
                    const isSelected = selectedSpot.name === spot.name;
                    return (
                      <button
                        key={spot.name}
                        type="button"
                        onClick={() => setSelectedSpot(spot)}
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
                </div>
              </div>

              {/* Tap 2: Select Time Slot & Duration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#B39051] text-[#051E39] inline-flex items-center justify-center text-[11px] font-extrabold">
                      2
                    </span>
                    <span>Select Time Slot</span>
                  </label>
                  {/* Duration Selector */}
                  <div className="flex items-center gap-1 bg-tp-canvas p-0.5 rounded-lg border border-[#B39051]/35">
                    {[30, 45, 60].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSelectedDuration(dur)}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold transition ${
                          selectedDuration === dur
                            ? 'bg-[#B39051] text-[#051E39]'
                            : 'text-tp-muted hover:text-tp-ink'
                        }`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {quickTimeSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot.date && !customDateTime;
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => {
                          setSelectedTimeSlot(slot.date);
                          setCustomDateTime('');
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition ${
                          isSelected
                            ? 'bg-tp-elevated border-[#B39051] text-tp-accent shadow-sm'
                            : 'bg-tp-canvas/60 border-[#B39051]/35 text-tp-muted hover:border-[#B39051]/50'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>

                {/* Optional Custom Time */}
                <div className="mt-2.5">
                  <label className="text-[11px] text-tp-subtle block mb-1">
                    Or pick custom time:
                  </label>
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => {
                      setCustomDateTime(e.target.value);
                      setSelectedTimeSlot('');
                    }}
                    className="w-full bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-1.5 text-xs text-tp-ink focus:outline-none focus:border-[#B39051]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  className="w-full py-3 px-4 rounded-xl bg-[#B39051] text-[#051E39] font-bold text-sm tracking-wide hover:bg-[#8F713D] active:bg-[#8F713D] transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Confirm & Download .ics Meetup</span>
                </button>
                <p className="text-[11px] text-center text-tp-subtle">
                  Instantly creates an RFC 5545 .ics invite + Google Calendar integration.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
