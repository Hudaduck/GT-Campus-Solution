import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { SwipeRadarView } from './SwipeRadarView';
import { Repository, DEMO_STUDENT_USER } from '../../shared/data/repository';

describe('SwipeRadarView Component', () => {
  beforeEach(() => {
    Repository.resetAllData();
  });

  it('renders student & alumni candidate card with fuzzy neighborhood badge and GT context', () => {
    const { getByText, getAllByText } = render(
      React.createElement(SwipeRadarView, {})
    );

    // Header 'Open to Meet' section
    expect(getAllByText('Open to Meet').length).toBeGreaterThanOrEqual(1);

    // Check candidate details (Alex Chen is first candidate for default current user Sarah Jenkins)
    expect(getByText('Alex Chen')).toBeDefined();

    // Fuzzy neighborhood badge
    expect(getByText('Midtown • Tech Square')).toBeDefined();
    expect(getByText(/Within 0.4 mi/i)).toBeDefined();

    // Intent pill
    expect(getAllByText('co-founder').length).toBeGreaterThanOrEqual(1);

    // Shared hobby chips (both Sarah & Alex share 'Pour-Over Coffee'), capitalized and highlighted
    expect(getByText('Pour-Over Coffee').closest('[data-shared]')).not.toBeNull();
  });

  it('advances to next candidate card when clicking pass (after the fly-out animation)', async () => {
    const { getByText, getByTitle, findByText, queryByText } = render(
      React.createElement(SwipeRadarView, {})
    );

    expect(getByText('Alex Chen')).toBeDefined();
    fireEvent.click(getByTitle('Pass'));

    // The viewer's own seed twin (Sarah Jenkins) is never shown, so Marcus is next
    expect(await findByText('Marcus Vance')).toBeDefined();
    expect(queryByText('Sarah Jenkins')).toBeNull();
  });

  it('shows Career & Network Overlap badges ("Works at" / "Ex-" / "Targeting:") alongside shared hobbies', async () => {
    Repository.setCurrentUser(DEMO_STUDENT_USER); // Student targeting Stripe, Anthropic, Google...
    const { getByTitle, getAllByTestId, getByText, findByText } = render(
      React.createElement(SwipeRadarView, {})
    );

    // First card for the student is Sarah (Stripe alum)
    expect(getByText('Sarah Jenkins')).toBeDefined();
    const badges = getAllByTestId('career-overlap-badge').map((b) => b.textContent);
    expect(badges.some((t) => t?.includes('Works at Stripe'))).toBe(true);
    expect(getAllByTestId('targeting-pill')[0].textContent).toMatch(/Targeting: .+ @ .+/);

    // Skip ahead to Elena: currently at Anthropic, previously at Google Brain
    fireEvent.click(getByTitle('Pass'));
    await findByText('Marcus Vance');
    fireEvent.click(getByTitle('Pass'));
    await findByText('Elena Rostova');
    const elenaBadges = getAllByTestId('career-overlap-badge').map((b) => b.textContent);
    expect(elenaBadges.some((t) => t?.includes('Works at Anthropic'))).toBe(true);
    expect(elenaBadges.some((t) => t?.includes('Ex-Google'))).toBe(true);
  });

  it('supports drag gestures: dragging the card right past the threshold connects', async () => {
    const { getByTestId, findByText } = render(React.createElement(SwipeRadarView, {}));
    const card = getByTestId('swipe-card');

    fireEvent.pointerDown(card, { clientX: 100, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 180, clientY: 205, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 300, clientY: 210, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 300, clientY: 210, pointerId: 1 });

    expect(await findByText("It's a Mutual Match!")).toBeDefined();
    expect(Repository.getMatches()[0].partnerProfile.name).toBe('Alex Chen');
  });

  it('snaps back without swiping when the drag is too short', async () => {
    const { getByTestId, getByText } = render(React.createElement(SwipeRadarView, {}));
    const card = getByTestId('swipe-card');

    fireEvent.pointerDown(card, { clientX: 100, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 140, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 140, clientY: 200, pointerId: 1 });

    await new Promise((r) => setTimeout(r, 300));
    expect(getByText('Alex Chen')).toBeDefined();
    expect(Repository.getMatches().length).toBe(0);
  });

  it('renders the Career & Hobby Match Breakdown card in the web layout', () => {
    const { getByTestId } = render(React.createElement(SwipeRadarView, { layout: 'web' }));
    const breakdown = getByTestId('match-breakdown-card');
    expect(breakdown.textContent).toContain('Career & Hobby Match Breakdown');
    expect(breakdown.textContent).toContain('Alex Chen');
  });

  it('triggers double opt-in match modal when clicking connect and persists match in Repository', () => {
    const { getByText, getByTitle } = render(
      React.createElement(SwipeRadarView, {})
    );

    const connectButton = getByTitle('Connect & Meet');
    fireEvent.click(connectButton);

    // Mutual Match Modal should appear
    expect(getByText("It's a Mutual Match!")).toBeDefined();
    expect(getByText(/Schedule Midpoint Coffee/i)).toBeDefined();

    // Match should be saved in Repository
    const matches = Repository.getMatches();
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].partnerProfile.name).toBe('Alex Chen');
  });

  it('lets you choose how long you stay Open to Meet and persists it', () => {
    const { getByText, getByRole } = render(
      React.createElement(SwipeRadarView, {})
    );

    // Plain-language status + action, no "TTL" jargon
    expect(getByText(/Expires in \d+h/)).toBeDefined();
    const ttlBtn = getByRole('button', { name: /^(Change|Go Live)$/ });
    fireEvent.click(ttlBtn);

    // Sheet asks a human question and explains auto-expiry per option
    expect(getByText('How long should you stay visible?')).toBeDefined();
    expect(getByText('Auto-expires in 24h')).toBeDefined();

    // Select 4 Hours
    const fourHourBtn = getByText('4 Hours');
    fireEvent.click(fourHourBtn);

    // Verify currentUser in Repository has updated openToMeetExpiresAt
    const updatedUser = Repository.getCurrentUser();
    expect(updatedUser.isOpenToMeet).toBe(true);
    expect(updatedUser.openToMeetExpiresAt).toBeGreaterThan(Date.now() + 3 * 3600 * 1000);
  });

  it('switches to the Reconnect Deck and displays event attendees', () => {
    const { getByText } = render(
      React.createElement(SwipeRadarView, {})
    );

    // Click Reconnect tab
    const reconnectTab = getByText(/Reconnect Deck/i);
    fireEvent.click(reconnectTab);

    // Re-Connect header should be visible
    expect(getByText('Post-Event Attendee Networking')).toBeDefined();
  });

  it('makes the active deck unmistakable: selected tab + matching heading', () => {
    const { getByTestId, queryByTestId } = render(React.createElement(SwipeRadarView, {}));

    expect(getByTestId('deck-tab-radar').getAttribute('aria-selected')).toBe('true');
    expect(getByTestId('deck-tab-reconnect').getAttribute('aria-selected')).toBe('false');
    expect(getByTestId('deck-heading-radar').textContent).toContain('One-on-One Radar');
    expect(queryByTestId('deck-heading-reconnect')).toBeNull();

    fireEvent.click(getByTestId('deck-tab-reconnect'));
    expect(getByTestId('deck-tab-reconnect').getAttribute('aria-selected')).toBe('true');
    expect(getByTestId('deck-heading-reconnect').textContent).toContain('Reconnect Deck');
    expect(queryByTestId('deck-heading-radar')).toBeNull();
  });

  it('renders deck tabs and headings as clean text with no icons or symbols', () => {
    const { getByTestId } = render(React.createElement(SwipeRadarView, {}));
    for (const id of ['deck-tab-radar', 'deck-tab-reconnect', 'deck-heading-radar']) {
      const el = getByTestId(id);
      expect(el.querySelector('svg')).toBeNull();
      expect(el.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-➿]/u);
    }
    expect(getByTestId('deck-tab-radar').textContent).toMatch(/^One-on-One Radar \(\d+\)$/);
    expect(getByTestId('deck-tab-reconnect').textContent).toMatch(/^Reconnect Deck \(\d+\)$/);
  });

  it('keeps the card front scannable and moves details into "Tap for full profile"', () => {
    Repository.setCurrentUser(DEMO_STUDENT_USER);
    const { getByTestId, queryByTestId, getByText, queryByText } = render(React.createElement(SwipeRadarView, {}));
    const card = getByTestId('swipe-card');

    // Front: name, class/major, current role, at most 3 shared hobbies + 2 career overlaps
    expect(card.textContent).toContain('Sarah Jenkins');
    expect(card.textContent).toContain("'18");
    expect(card.textContent).toContain('Industrial & Systems Engineering');
    expect(card.textContent).toContain('Stripe • Senior Product Lead');
    expect(card.querySelectorAll('[data-shared]').length).toBeLessThanOrEqual(3);
    const overlaps = card.querySelectorAll('[data-testid="career-overlap-badge"], [data-testid="targeting-pill"]');
    expect(overlaps.length).toBeGreaterThan(0);
    expect(overlaps.length).toBeLessThanOrEqual(2);

    // Bio and work history are not crammed onto the front
    expect(queryByText(/Building payments infra at Stripe/)).toBeNull();
    expect(queryByTestId('full-profile-sheet')).toBeNull();

    fireEvent.click(getByTestId('open-full-profile'));
    const sheet = getByTestId('full-profile-sheet');
    expect(sheet.textContent).toContain('Building payments infra at Stripe');
    expect(sheet.textContent).toContain('Delta Air Lines');
    expect(getByText('Experience')).toBeDefined();
  });

  it('never shows "TTL" jargon to users', () => {
    const { container, getByRole } = render(React.createElement(SwipeRadarView, {}));
    fireEvent.click(getByRole('button', { name: /^(Change|Go Live)$/ }));
    expect(container.ownerDocument.body.textContent).not.toMatch(/\bTTL\b/);
  });
});
