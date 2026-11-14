import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { MeetupIntent } from '../contracts';
import { INTENT_CATALOG, INTENT_ORDER, MAX_INTENTS } from '../intents';
import { INTENT_ICONS } from './intentIcons';

interface IntentPickerProps {
  value: MeetupIntent[];
  onChange: (next: MeetupIntent[]) => void;
  compact?: boolean; // one-line chips (My Profile) vs cards with descriptions (Onboarding)
}

/**
 * Multi-select "What are you looking for?" picker (up to MAX_INTENTS).
 * Selecting nothing (or "Open to anything") means the person fits every match.
 */
export const IntentPicker: React.FC<IntentPickerProps> = ({ value, onChange, compact = false }) => {
  const atLimit = value.length >= MAX_INTENTS;

  const toggle = (id: MeetupIntent) => {
    if (value.includes(id)) onChange(value.filter((i) => i !== id));
    else if (!atLimit) onChange([...value, id]);
  };

  const base = compact
    ? 'px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition'
    : 'p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all';
  const on = 'border-[#B39051] bg-[#051E39]/90 tp-on-navy text-tp-ink ring-1 ring-[#B39051]';
  const off = 'border-tp-line bg-tp-canvas/60 text-tp-muted hover:border-[#B39051]/60 hover:text-tp-ink';

  return (
    <div>
      <div
        role="group"
        aria-label="What are you looking for?"
        className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-2.5'}
      >
        {INTENT_ORDER.map((id) => {
          const def = INTENT_CATALOG[id];
          const Icon = INTENT_ICONS[id];
          const selected = value.includes(id);
          const disabled = !selected && atLimit;
          return (
            <button
              key={id}
              type="button"
              data-testid={`intent-btn-${id}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(id)}
              className={`${base} ${selected ? on : off} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="flex items-center gap-1.5 font-semibold text-xs">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{def.label}</span>
                {selected && <Check className="w-3.5 h-3.5 shrink-0 text-tp-accent" />}
              </span>
              {!compact && <span className="text-[11px] text-tp-subtle line-clamp-1">{def.desc}</span>}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="intent-btn-open"
          aria-pressed={value.length === 0}
          onClick={() => onChange([])}
          className={`${base} ${value.length === 0 ? on : off}`}
        >
          <span className="flex items-center gap-1.5 font-semibold text-xs">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">Open to anything</span>
          </span>
          {!compact && <span className="text-[11px] text-tp-subtle line-clamp-1">Any serendipitous Yellow Jacket connection</span>}
        </button>
      </div>
      <p className="text-[11px] text-tp-subtle mt-1.5">
        Pick up to {MAX_INTENTS}. {value.length > 0 && `${value.length}/${MAX_INTENTS} selected.`}
      </p>
    </div>
  );
};
