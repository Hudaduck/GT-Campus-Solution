// Booked meetup in chat (reschedule / cancel), My Plans inbox + unread, Undo after Pass
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ChatDrawer } from './ChatDrawer';
import { MyPlansView } from './MyPlansView';
import { SchedulerDrawer } from './SchedulerDrawer';
import { SwipeRadarView } from '../swipe-radar/SwipeRadarView';
import { Repository, INITIAL_PROFILES, INITIAL_CURRENT_USER, DEMO_REPLY_DELAY_MS } from '../../shared/data/repository';

const alex = INITIAL_PROFILES[0];

// Sarah + Alex have chatted (both spoke) and booked a meetup
function bookMeetup() {
  const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, alex);
  Repository.sendMessage(match.id, INITIAL_CURRENT_USER, 'Free Thursday?');
  Repository.sendMessage(match.id, alex, 'Yes!');
  vi.spyOn(window, 'open').mockImplementation(() => null);
  const { unmount } = render(
    React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: alex, matchId: match.id })
  );
  fireEvent.click(screen.getByText(/Confirm & Add to Google Calendar/i));
  unmount();
  return match;
}

describe('Chat knows about the booked meetup', () => {
  beforeEach(() => Repository.resetAllData());
  afterEach(() => vi.restoreAllMocks());

  it('shows the booked plan instead of "Ready to meet?", and cancel needs a second tap', () => {
    const match = bookMeetup();
    render(React.createElement(ChatDrawer, { isOpen: true, onClose: () => {}, partner: alex }));

    expect(screen.getByTestId('chat-booked').textContent).toMatch(/Booked ·/);
    expect(screen.queryByTestId('plan-in-person')).toBeNull();

    const cancel = screen.getByTestId('chat-cancel-meetup');
    fireEvent.click(cancel);
    expect(cancel.textContent).toBe('Tap again to cancel');
    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER)).toHaveLength(1);
    fireEvent.click(cancel);

    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER)).toHaveLength(0);
    expect(Repository.findMatchWith(INITIAL_CURRENT_USER.id, alex.id)?.status).toBe('matched');
    const thread = Repository.getMessages(match.id);
    expect(thread[thread.length - 1].text).toMatch(/^Cancelled our meetup on /);
    expect(screen.getByTestId('plan-in-person')).toBeDefined(); // can plan again
  });

  it('Reschedule opens the scheduler pre-filled and replaces the meetup (same id)', () => {
    bookMeetup();
    const before = Repository.getMeetupsFor(INITIAL_CURRENT_USER)[0];
    render(React.createElement(ChatDrawer, { isOpen: true, onClose: () => {}, partner: alex }));
    fireEvent.click(screen.getByTestId('chat-reschedule'));

    expect(screen.getByText(/Reschedule & Update Google Calendar/)).toBeDefined();
    expect((screen.getByTestId('meetup-time-input') as HTMLInputElement).value).toBe(
      `${String(new Date(before.scheduledTime).getHours()).padStart(2, '0')}:${String(new Date(before.scheduledTime).getMinutes()).padStart(2, '0')}`
    );
    fireEvent.change(screen.getByTestId('meetup-time-input'), { target: { value: '15:00' } });
    fireEvent.click(screen.getByText(/Reschedule & Update Google Calendar/));

    const after = Repository.getMeetupsFor(INITIAL_CURRENT_USER);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
    expect(new Date(after[0].scheduledTime).getHours()).toBe(15);
    expect(screen.getByText('Meetup Rescheduled!')).toBeDefined();
  });
});

describe('My Plans: cancel needs confirming, Reschedule button, Messages inbox', () => {
  beforeEach(() => Repository.resetAllData());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('the meetup card cancels only on the second tap', () => {
    bookMeetup();
    render(React.createElement(MyPlansView, {}));
    expect(screen.getByTestId('meetup-reschedule')).toBeDefined();
    const cancel = screen.getByTestId('meetup-cancel');
    fireEvent.click(cancel);
    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER)).toHaveLength(1);
    fireEvent.click(screen.getByTestId('meetup-cancel'));
    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER)).toHaveLength(0);
  });

  it('lists conversations with unread counts, which clear when the chat is opened', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, alex);
    Repository.sendMessage(match.id, INITIAL_CURRENT_USER, 'Hi Alex!', alex); // simulated reply queued
    act(() => {
      vi.advanceTimersByTime(DEMO_REPLY_DELAY_MS + 100);
    });
    expect(Repository.getUnreadCount(INITIAL_CURRENT_USER)).toBe(1);

    render(React.createElement(MyPlansView, {}));
    fireEvent.click(screen.getByTestId('plans-tab-messages'));
    const row = screen.getByTestId('inbox-row');
    expect(row.textContent).toContain('Alex Chen');
    expect(screen.getByTestId('inbox-unread').textContent).toBe('1');

    fireEvent.click(row); // opens the chat, which marks it read
    expect(Repository.getUnreadCount(INITIAL_CURRENT_USER)).toBe(0);
  });
});

describe('Undo after Pass', () => {
  beforeEach(() => Repository.resetAllData());

  it('brings the passed person back', () => {
    render(React.createElement(SwipeRadarView, {}));
    expect(screen.getByText('Alex Chen')).toBeDefined();
    fireEvent.click(screen.getByTitle('Pass'));
    expect(screen.queryByText('Alex Chen')).toBeNull();
    expect(screen.getByTestId('undo-pass').textContent).toContain('Passed on Alex');
    fireEvent.click(screen.getByText('Undo'));
    expect(screen.getByText('Alex Chen')).toBeDefined();
    expect(screen.queryByTestId('undo-pass')).toBeNull();
  });
});
