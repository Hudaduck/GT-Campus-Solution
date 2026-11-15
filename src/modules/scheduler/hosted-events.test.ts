// Hosts delete their pop-ups (they can't "leave" them); attendees leave
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MyPlansView } from './MyPlansView';
import { EventDetailDrawer } from '../events-map/EventDetailDrawer';
import { Repository, INITIAL_CURRENT_USER, DEMO_STUDENT_USER } from '../../shared/data/repository';
import type { ScoredEventItem } from '../events-map/types';

const FINTECH = 'event_fintech_alumni_dinner'; // hosted by Sarah's seed twin

describe('Hosting vs attending a pop-up', () => {
  beforeEach(() => Repository.resetAllData());

  it("the host can't leave their own pop-up", () => {
    expect(Repository.rsvpEvent(FINTECH, INITIAL_CURRENT_USER.id)).toBe(false);
    expect(Repository.getEvents().find((e) => e.id === FINTECH)?.attendees).toContain(INITIAL_CURRENT_USER.id);
  });

  it('only the host can delete, and a deleted demo pop-up stays deleted', () => {
    expect(Repository.deleteEvent(FINTECH, DEMO_STUDENT_USER)).toBe(false);
    expect(Repository.deleteEvent(FINTECH, INITIAL_CURRENT_USER)).toBe(true);
    expect(Repository.getEvents().some((e) => e.id === FINTECH)).toBe(false);
    // rolling seeds don't re-issue it on later reads
    expect(Repository.getEvents().some((e) => e.id === FINTECH)).toBe(false);
    // Reset demo brings it back
    Repository.resetAllData();
    expect(Repository.getEvents().some((e) => e.id === FINTECH)).toBe(true);
  });

  it('My Plans: hosted pop-ups show Hosting + two-tap Delete instead of Leave', () => {
    render(React.createElement(MyPlansView, {}));
    expect(screen.getAllByTestId('hosting-badge').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('event-leave')).toBeNull();

    const before = screen.getAllByTestId('event-delete').length;
    fireEvent.click(screen.getAllByTestId('event-delete')[0]);
    expect(screen.getAllByTestId('event-delete')[0].textContent).toBe('Tap to delete');
    expect(screen.getAllByTestId('event-delete')).toHaveLength(before);
    fireEvent.click(screen.getAllByTestId('event-delete')[0]);
    expect(screen.queryAllByTestId('event-delete')).toHaveLength(before - 1);
  });

  it('My Plans: Leave removes a pop-up you only joined', () => {
    const joinable = Repository.getEvents().find(
      (e) => e.hostId !== INITIAL_CURRENT_USER.id && !e.attendees.includes(INITIAL_CURRENT_USER.id) && e.attendees.length < e.maxAttendees
    )!;
    Repository.rsvpEvent(joinable.id, INITIAL_CURRENT_USER.id);
    render(React.createElement(MyPlansView, {}));
    expect(screen.getByText(joinable.title)).toBeDefined();
    fireEvent.click(screen.getByTestId('event-leave'));
    expect(screen.queryByText(joinable.title)).toBeNull();
  });

  it('map drawer: the host sees "You\'re hosting" and can delete', () => {
    const event = Repository.getEvents().find((e) => e.id === FINTECH)! as ScoredEventItem;
    let deleted = '';
    render(
      React.createElement(EventDetailDrawer, {
        event,
        currentUser: Repository.getCurrentUser(),
        isOpen: true,
        onClose: () => {},
        onDeleted: (id: string) => (deleted = id),
      })
    );
    expect(screen.queryByTestId('rsvp-button')).toBeNull();
    expect(screen.getByTestId('hosting-status')).toBeDefined();
    fireEvent.click(screen.getByTestId('delete-event'));
    expect(deleted).toBe('');
    fireEvent.click(screen.getByTestId('delete-event'));
    expect(deleted).toBe(FINTECH);
  });
});
