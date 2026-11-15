import React, { useId, useMemo, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { formatHobby } from '../data/repository';

interface HobbyComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  max?: number;
}

const MAX_OPTIONS = 8;
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Type-to-search hobby picker: selected hobbies are removable chips; typing filters a
 * dropdown of suggestions (click or ↑/↓ + Enter), and anything not in the list can be
 * added as-is via the "Add …" option. Backspace in an empty box removes the last chip.
 */
export const HobbyCombobox: React.FC<HobbyComboboxProps> = ({ value, onChange, suggestions, max = 5 }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const atMax = value.length >= max;

  const selected = useMemo(() => new Set(value.map(norm)), [value]);

  // Matching suggestions (prefix matches first), plus "Add <query>" when it's new
  const options = useMemo(() => {
    const q = norm(query);
    const pool = [...new Set(suggestions.map(formatHobby))].filter((h) => !selected.has(norm(h)));
    const matches = q
      ? pool
          .filter((h) => norm(h).includes(q))
          .sort((a, b) => Number(norm(b).startsWith(q)) - Number(norm(a).startsWith(q)))
      : pool;
    const list: { label: string; custom: boolean }[] = matches.slice(0, MAX_OPTIONS).map((label) => ({ label, custom: false }));
    const exact = pool.some((h) => norm(h) === q) || selected.has(q);
    if (q && !exact) list.push({ label: formatHobby(query), custom: true });
    return list;
  }, [query, suggestions, selected]);

  const add = (raw: string) => {
    const hobby = formatHobby(raw);
    if (!hobby || atMax || selected.has(norm(hobby))) return;
    onChange([...value, hobby]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const remove = (hobby: string) => onChange(value.filter((h) => h !== hobby));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = options[active];
      if (open && pick) add(pick.label);
      else if (query.trim()) add(query);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  const showList = open && !atMax && options.length > 0;

  return (
    <div className="space-y-2" data-testid="hobby-combobox">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Your hobbies">
          {value.map((hobby) => (
            <li
              key={hobby}
              className="flex items-center gap-1 text-xs pl-3 pr-1 py-1 rounded-xl bg-[#B39051] text-[#051E39] font-bold"
            >
              {hobby}
              <button
                type="button"
                aria-label={`Remove ${hobby}`}
                onClick={() => remove(hobby)}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#051E39]/15"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 focus-within:border-[#B39051]">
          <Search aria-hidden="true" className="w-3.5 h-3.5 text-tp-subtle shrink-0" />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Add a hobby"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
            value={query}
            disabled={atMax}
            maxLength={40}
            placeholder={atMax ? `${max} of ${max} added: remove one to add another` : 'Type a hobby, e.g. Hiking'}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="flex-1 min-w-0 bg-transparent py-2 text-xs text-tp-ink placeholder:text-tp-subtle outline-none disabled:cursor-not-allowed"
          />
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Hobby suggestions"
            className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#B39051]/50 bg-tp-surface shadow-xl py-1"
          >
            {options.map((opt, i) => (
              <li
                key={`${opt.custom ? 'add:' : ''}${opt.label}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown (not click) so the input's blur doesn't close the list first
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(opt.label);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 text-xs cursor-pointer flex items-center gap-1.5 ${
                  i === active ? 'bg-tp-elevated text-tp-ink' : 'text-tp-muted'
                }`}
              >
                {opt.custom ? (
                  <>
                    <Plus className="w-3.5 h-3.5 text-tp-accent shrink-0" />
                    <span>
                      Add "<span className="font-semibold text-tp-ink">{opt.label}</span>"
                    </span>
                  </>
                ) : (
                  opt.label
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
