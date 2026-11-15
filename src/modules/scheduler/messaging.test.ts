import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ChatDrawer } from './ChatDrawer';
import { SchedulerDrawer } from './SchedulerDrawer';
import {
  Repository,
  INITIAL_PROFILES,
  INITIAL_CURRENT_USER,
  DEMO_REPLY_DELAY_MS,
  sanitizeMeetingLink,
} from '../../shared/data/repository';

const partner = INITIAL_PROFILES[0]; // Alex Chen

describe('Messaging repository', () => {
  beforeEach(() => Repository.resetAllData());

  it('getOrCreateMatch reuses an existing match in either direction', () => {
    const a = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    const b = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    expect(b.id).toBe(a.id);
    expect(Repository.getMatches()).toHaveLength(1);
    expect(Repository.findMatchWith(partner.id, INITIAL_CURRENT_USER.id)?.id).toBe(a.id);
  });

  it('queues exactly one simulated partner reply after the first message', () => {
    const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    Repository.sendMessage(match.id, INITIAL_CURRENT_USER, 'Hey Alex!', partner);
    Repository.sendMessage(match.id, INITIAL_CURRENT_USER, 'Second message', partner);

    const thread = Repository.getMessages(match.id);
    const fromPartner = thread.filter((m) => m.senderId === partner.id);
    expect(thread).toHaveLength(3);
    expect(fromPartner).toHaveLength(1);
    expect(fromPartner[0].sentAt).toBeGreaterThan(Date.now());
    expect(fromPartner[0].text).toMatch(/in person or hop on a quick video call/);
  });

  it('ignores blank messages and keeps threads separate per match', () => {
    const m1 = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    const m2 = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, INITIAL_PROFILES[1]);
    expect(Repository.sendMessage(m1.id, INITIAL_CURRENT_USER, '   ')).toBeNull();
    Repository.sendMessage(m2.id, INITIAL_CURRENT_USER, 'Hi');
    expect(Repository.getMessages(m1.id)).toHaveLength(0);
    expect(Repository.getMessages(m2.id)).toHaveLength(1);
  });

  it('resetAllData clears messages', () => {
    const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    Repository.sendMessage(match.id, INITIAL_CURRENT_USER, 'Hi');
    Repository.resetAllData();
    expect(Repository.getMessages(match.id)).toHaveLength(0);
  });

  it('sanitizeMeetingLink only accepts http(s) URLs', () => {
    expect(sanitizeMeetingLink('meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
    expect(sanitizeMeetingLink('https://zoom.us/j/123')).toBe('https://zoom.us/j/123');
    expect(sanitizeMeetingLink('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeMeetingLink('ftp://files.example.com')).toBeUndefined();
    expect(sanitizeMeetingLink('  ')).toBeUndefined();
  });
});

describe('ChatDrawer', () => {
  beforeEach(() => {
    Repository.resetAllData();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  });
  afterEach(() => vi.useRealTimers());

  it('sends a message, shows the typing indicator, then reveals the partner reply', () => {
    const { getByLabelText, getByText, queryByTestId, getAllByTestId } = render(
      React.createElement(ChatDrawer, { isOpen: true, onClose: () => {}, partner })
    );

    expect(getByText(/Say hi to Alex/)).toBeDefined();
    fireEvent.change(getByLabelText('Message'), { target: { value: 'Hi Alex, want to chat?' } });
    fireEvent.click(getByLabelText('Send message'));

    expect(getAllByTestId('chat-message-mine')).toHaveLength(1);
    expect(queryByTestId('chat-typing')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(DEMO_REPLY_DELAY_MS + 500);
    });
    expect(queryByTestId('chat-typing')).toBeNull();
    expect(getAllByTestId('chat-message-theirs')).toHaveLength(1);
  });

  it('keeps scheduling locked until both people have messaged', () => {
    const { getByTestId, queryByTestId, getByLabelText } = render(
      React.createElement(ChatDrawer, { isOpen: true, onClose: () => {}, partner })
    );
    const inPerson = getByTestId('plan-in-person') as HTMLButtonElement;
    const online = getByTestId('plan-online') as HTMLButtonElement;
    expect(inPerson.disabled).toBe(true);
    expect(online.disabled).toBe(true);
    expect(queryByTestId('schedule-locked-hint')).not.toBeNull();

    // Only my message so far (reply still "typing"): still locked
    fireEvent.change(getByLabelText('Message'), { target: { value: 'When are you free?' } });
    fireEvent.click(getByLabelText('Send message'));
    expect(inPerson.disabled).toBe(true);

    // Partner's reply arrives: unlocked
    act(() => {
      vi.advanceTimersByTime(DEMO_REPLY_DELAY_MS + 500);
    });
    expect(inPerson.disabled).toBe(false);
    expect(online.disabled).toBe(false);
    expect(queryByTestId('schedule-locked-hint')).toBeNull();
  });

  it('opens the scheduler preset to online from "Meet online"', () => {
    const { getByTestId, getByLabelText } = render(
      React.createElement(ChatDrawer, { isOpen: true, onClose: () => {}, partner })
    );
    fireEvent.change(getByLabelText('Message'), { target: { value: 'Video call this week?' } });
    fireEvent.click(getByLabelText('Send message'));
    act(() => {
      vi.advanceTimersByTime(DEMO_REPLY_DELAY_MS + 500);
    });
    fireEvent.click(getByTestId('plan-online'));
    expect(getByTestId('format-online').getAttribute('aria-checked')).toBe('true');
    expect(getByTestId('format-in-person').getAttribute('aria-checked')).toBe('false');
  });
});

describe('SchedulerDrawer online meetings', () => {
  beforeEach(() => Repository.resetAllData());

  it('schedules a video call with a link and posts the plan into the chat thread', () => {
    const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    let scheduled: any = null;
    const { getByTestId, getByText, getByLabelText } = render(
      React.createElement(SchedulerDrawer, {
        isOpen: true,
        onClose: () => {},
        partner,
        matchId: match.id,
        onScheduled: (m) => (scheduled = m),
      })
    );

    fireEvent.click(getByTestId('format-online'));
    fireEvent.click(getByText('Zoom'));
    fireEvent.change(getByLabelText(/Meeting link/), { target: { value: 'zoom.us/j/987654' } });
    fireEvent.click(getByText(/Confirm & Download .ics Meetup/i));

    expect(scheduled.format).toBe('online');
    expect(scheduled.onlinePlatform).toBe('Zoom');
    expect(scheduled.meetingLink).toBe('https://zoom.us/j/987654');
    expect(scheduled.locationName).toBe('Zoom');
    expect(scheduled.icsContent).toContain('SUMMARY:ThirdPlace Video Chat');

    expect(Repository.findMatchWith(INITIAL_CURRENT_USER.id, partner.id)?.status).toBe('scheduled');
    const thread = Repository.getMessages(match.id);
    expect(thread[thread.length - 1].text).toMatch(/video call on Zoom.*https:\/\/zoom\.us\/j\/987654/);
  });

  it('offers recommended spots and lets you enter your own address instead', () => {
    const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    let scheduled: any = null;
    const { getByText, getByTestId, getByLabelText } = render(
      React.createElement(SchedulerDrawer, {
        isOpen: true,
        onClose: () => {},
        partner,
        matchId: match.id,
        onScheduled: (m) => (scheduled = m),
      })
    );

    expect(getByText('Recommended Spots')).toBeDefined();
    expect(getByText('Dancing Goats Coffee Bar')).toBeDefined();

    fireEvent.click(getByTestId('spot-custom'));
    const confirm = getByText(/Confirm & Download .ics Meetup/i).closest('button')!;
    expect(confirm.disabled).toBe(true); // address required

    fireEvent.change(getByLabelText(/Place name/), { target: { value: 'Piedmont Park' } });
    fireEvent.change(getByLabelText(/^Address/), { target: { value: '400 Park Dr NE, Atlanta, GA' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    expect(scheduled.format).toBe('in-person');
    expect(scheduled.locationName).toBe('Piedmont Park');
    expect(scheduled.locationAddress).toBe('400 Park Dr NE, Atlanta, GA');
    expect(scheduled.icsContent).toContain('LOCATION:Piedmont Park, 400 Park Dr NE');
    const thread = Repository.getMessages(match.id);
    expect(thread[thread.length - 1].text).toMatch(/meetup at Piedmont Park \(400 Park Dr NE, Atlanta, GA\)/);
  });

  it('blocks confirming with an invalid link', () => {
    let scheduled: any = null;
    const { getByTestId, getByLabelText, getByText } = render(
      React.createElement(SchedulerDrawer, {
        isOpen: true,
        onClose: () => {},
        partner,
        onScheduled: (m) => (scheduled = m),
      })
    );
    fireEvent.click(getByTestId('format-online'));
    fireEvent.change(getByLabelText(/Meeting link/), { target: { value: 'javascript:alert(1)' } });
    expect(getByText(/Enter a valid http\(s\) link/)).toBeDefined();
    fireEvent.click(getByText(/Confirm & Download .ics Meetup/i));
    expect(scheduled).toBeNull();
  });
});
