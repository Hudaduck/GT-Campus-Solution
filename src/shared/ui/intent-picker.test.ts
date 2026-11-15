import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { IntentPicker } from './IntentPicker';
import { MeetupIntent } from '../contracts';
import { Repository, INITIAL_CURRENT_USER, INITIAL_PROFILES } from '../data/repository';
import { isIntentCompatible } from '../intents';

// Stateful harness so clicks flow back into the picker like in the real forms
function Harness({ initial, onValue }: { initial: MeetupIntent[]; onValue?: (v: MeetupIntent[]) => void }) {
  const [value, setValue] = useState<MeetupIntent[]>(initial);
  return React.createElement(IntentPicker, {
    value,
    viewer: INITIAL_CURRENT_USER,
    onChange: (v) => {
      setValue(v);
      onValue?.(v);
    },
  });
}

const pressed = (el: HTMLElement) => el.getAttribute('aria-pressed') === 'true';

describe('IntentPicker', () => {
  beforeEach(() => Repository.resetAllData());

  it('allows only one mentorship side but any number of other intents', () => {
    let latest: MeetupIntent[] = [];
    const { getByTestId, getByText } = render(React.createElement(Harness, { initial: [], onValue: (v) => (latest = v) }));

    fireEvent.click(getByTestId('intent-btn-find-mentor'));
    expect(pressed(getByTestId('intent-btn-find-mentor'))).toBe(true);
    // Choosing the other side switches, it doesn't add
    fireEvent.click(getByTestId('intent-btn-give-mentorship'));
    expect(pressed(getByTestId('intent-btn-give-mentorship'))).toBe(true);
    expect(pressed(getByTestId('intent-btn-find-mentor'))).toBe(false);

    for (const id of ['co-founder', 'study', 'casual', 'roommate']) {
      fireEvent.click(getByTestId(`intent-btn-${id}`));
    }
    expect(getByText(/5 picked/)).toBeDefined();
    expect(latest).toEqual(['give-mentorship', 'co-founder', 'study', 'casual', 'roommate']);

    // Tapping the chosen side again clears mentorship
    fireEvent.click(getByTestId('intent-btn-give-mentorship'));
    expect(latest).toEqual(['co-founder', 'study', 'casual', 'roommate']);
  });

  it('stores picks in canonical order regardless of tap order', () => {
    let latest: MeetupIntent[] = [];
    const { getByTestId } = render(React.createElement(Harness, { initial: [], onValue: (v) => (latest = v) }));
    fireEvent.click(getByTestId('intent-btn-casual'));
    fireEvent.click(getByTestId('intent-btn-find-mentor'));
    expect(latest).toEqual(['find-mentor', 'casual']);
  });

  it('replaces the "Open to anything" tile with a status line and a Clear link', () => {
    const { getByTestId, queryByTestId } = render(React.createElement(Harness, { initial: ['co-founder'] }));
    expect(queryByTestId('intent-open-status')).toBeNull();
    fireEvent.click(getByTestId('intent-clear'));
    expect(getByTestId('intent-open-status').textContent).toContain("you're open to anything");
    expect(queryByTestId('intent-clear')).toBeNull();
  });

  it('shows a live count of radar people who line up with the current picks', () => {
    const others = INITIAL_PROFILES.filter((p) => p.email !== INITIAL_CURRENT_USER.email);
    const expected = (intents: MeetupIntent[]) => others.filter((p) => isIntentCompatible({ intents }, p)).length;

    const { getByTestId } = render(React.createElement(Harness, { initial: [] }));
    expect(getByTestId('intent-match-count').textContent).toBe(`All ${others.length} people`);

    fireEvent.click(getByTestId('intent-btn-roommate'));
    expect(getByTestId('intent-match-count').textContent).toBe(`${expected(['roommate'])} of ${others.length} people line up`);

    fireEvent.click(getByTestId('intent-btn-casual'));
    const widened = expected(['casual', 'roommate']);
    expect(widened).toBeGreaterThan(expected(['roommate']));
    expect(getByTestId('intent-match-count').textContent).toBe(`${widened} of ${others.length} people line up`);
  });
});
