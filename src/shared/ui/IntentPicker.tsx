import React, { useMemo } from 'react';
import { Check, Sparkles, Users } from 'lucide-react';
import { MeetupIntent, UserProfile } from '../contracts';
import {
  INTENT_CATALOG,
  INTENT_ORDER,
  MENTORSHIP_INTENTS,
  isIntentCompatible,
  toggleIntent,
} from '../intents';
import { Repository, isSamePerson } from '../data/repository';
import { INTENT_ICONS } from './intentIcons';

interface IntentPickerProps {
  value: MeetupIntent[];
  onChange: (next: MeetupIntent[]) => void;
  compact?: boolean; // tighter layout without descriptions (My Profile, LinkedIn review)
  viewer?: UserProfile; // when given, shows how many people on the radar line up
}

const MENTORSHIP_TOGGLES: { id: MeetupIntent; label: string }[] = [
  { id: 'find-mentor', label: 'Get mentored' },
  { id: 'give-mentorship', label: 'Mentor others' },
];

const OTHER_INTENTS = INTENT_ORDER.filter((i) => !MENTORSHIP_INTENTS.includes(i));

/**
 * "What are you looking for?" picker.
 * - Pick as many as you like, except mentorship: one row where you choose ONE side
 *   (get mentored or mentor others); tap the chosen side again to clear it.
 * - Selecting nothing means "open to anything"; a Clear link gets back there.
 * - With a `viewer`, a live count shows who the choice lines up with on the radar.
 */
export const IntentPicker: React.FC<IntentPickerProps> = ({ value, onChange, compact = false, viewer }) => {
  const toggle = (id: MeetupIntent) => onChange(toggleIntent(value, id));

  // People the viewer would see on the radar (read once per open; the list is small)
  const radar = useMemo(
    () => (viewer ? Repository.getProfiles().filter((p) => !isSamePerson(p, viewer)) : []),
    [viewer?.id]
  );
  const lineUp = radar.filter((p) => isIntentCompatible({ intents: value }, p)).length;

  const toggleClass = (selected: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold min-h-[40px] px-3 transition ${
      selected
        ? 'border-[#B39051] bg-[#051E39]/90 tp-on-navy text-tp-ink ring-1 ring-[#B39051]'
        : 'border-tp-line bg-tp-canvas/60 text-tp-muted hover:border-[#B39051]/60 hover:text-tp-ink'
    }`;

  const MentorIcon = INTENT_ICONS['find-mentor'];
  const mentorshipOn = value.some((i) => MENTORSHIP_INTENTS.includes(i));

  return (
    <div className="space-y-2.5" data-testid="intent-picker">
      {/* Mentorship: one row, two sides, either or both */}
      <div
        role="group"
        aria-label="Mentorship"
        className={`rounded-xl border p-2.5 space-y-2 ${mentorshipOn ? 'border-[#B39051]/70' : 'border-tp-line'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-tp-ink">
            <MentorIcon className="w-4 h-4 text-tp-accent" />
            Mentorship
          </span>
          <span className="text-[10px] text-tp-subtle">Pick one side</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MENTORSHIP_TOGGLES.map(({ id, label }) => {
            const selected = value.includes(id);
            return (
              <button
                key={id}
                type="button"
                data-testid={`intent-btn-${id}`}
                aria-pressed={selected}
                onClick={() => toggle(id)}
                className={toggleClass(selected)}
              >
                {label}
                {selected && <Check className="w-3.5 h-3.5 text-tp-accent" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Everything else */}
      <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2.5'}>
        {OTHER_INTENTS.map((id) => {
          const def = INTENT_CATALOG[id];
          const Icon = INTENT_ICONS[id];
          const selected = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              data-testid={`intent-btn-${id}`}
              aria-pressed={selected}
              onClick={() => toggle(id)}
              className={`${toggleClass(selected)} ${compact ? '' : '!justify-start !items-start flex-col !gap-0.5 py-2 text-left'}`}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{def.label}</span>
                {selected && <Check className="w-3.5 h-3.5 shrink-0 text-tp-accent" />}
              </span>
              {!compact && <span className="text-[11px] font-normal text-tp-subtle line-clamp-1">{def.desc}</span>}
            </button>
          );
        })}
      </div>

      {/* Status: picks used / open to anything, and the live radar count */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
        {value.length === 0 ? (
          <p data-testid="intent-open-status" className="text-tp-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-tp-accent shrink-0" />
            Nothing picked: you're open to anything.
          </p>
        ) : (
          <p className="text-tp-subtle">
            {value.length} picked ·{' '}
            <button
              type="button"
              data-testid="intent-clear"
              onClick={() => onChange([])}
              className="underline text-tp-muted hover:text-tp-ink"
            >
              Clear (open to anything)
            </button>
          </p>
        )}
        {viewer && (
          <p data-testid="intent-match-count" className="text-tp-accent font-semibold flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3" />
            {value.length === 0 ? `All ${radar.length} people` : `${lineUp} of ${radar.length} people line up`}
          </p>
        )}
      </div>
    </div>
  );
};
