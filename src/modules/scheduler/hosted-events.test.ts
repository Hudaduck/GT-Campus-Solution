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

describe('Directions links and the Hosting tab', () => {
  beforeEach(() => Repository.resetAllData());

  it('event and meetup locations link to Google Maps directions', async () => {
    const { eventDestination, directionsUrl } = await import('../../shared/maps');
    // built-in pop-ups: exact coordinates
    expect(eventDestination({ id: 'event_x', lat: 33.77, lng: -84.39, locationName: 'Tech Square' })).toBe('33.77,-84.39');
    // user-hosted: the address they typed, else the place name in Atlanta (their pin is approximate)
    expect(eventDestination({ id: 'event_user_1', lat: 0, lng: 0, locationName: 'CULC', address: '266 4th St NW' })).toBe('266 4th St NW');
    expect(eventDestination({ id: 'event_user_1', lat: 0, lng: 0, locationName: 'CULC' })).toBe('CULC, Atlanta, GA');
    expect(directionsUrl('266 4th St NW')).toBe('https://www.google.com/maps/dir/?api=1&destination=266%204th%20St%20NW');

    render(React.createElement(MyPlansView, {}));
    const link = screen.getAllByTestId('event-directions')[0] as HTMLAnchorElement;
    expect(link.href).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
    expect(link.target).toBe('_blank');
  });

  it('Hosting tab lists only the pop-ups you host; RSVPs lists the ones you joined', () => {
    const joinable = Repository.getEvents().find(
      (e) => e.hostId !== INITIAL_CURRENT_USER.id && !e.attendees.includes(INITIAL_CURRENT_USER.id) && e.attendees.length < e.maxAttendees
    )!;
    Repository.rsvpEvent(joinable.id, INITIAL_CURRENT_USER.id);
    render(React.createElement(MyPlansView, {}));

    fireEvent.click(screen.getByTestId('plans-tab-hosting'));
    expect(screen.getByTestId('plans-section-hosting')).toBeDefined();
    expect(screen.queryByTestId('plans-section-going')).toBeNull();
    expect(screen.queryByText(joinable.title)).toBeNull();
    expect(screen.getByText('Fintech & Quant Fireside Chat @ Tech Square')).toBeDefined();

    fireEvent.click(screen.getByText(/^RSVPs \(1\)$/));
    expect(screen.getByText(joinable.title)).toBeDefined();
    expect(screen.queryByTestId('plans-section-hosting')).toBeNull();
  });
});

describe('Pop-ups you joined, in My Plans', () => {
  beforeEach(() => Repository.resetAllData());

  const joinOne = () => {
    const joinable = Repository.getEvents().find(
      (e) => e.hostId !== INITIAL_CURRENT_USER.id && !e.attendees.includes(INITIAL_CURRENT_USER.id) && e.attendees.length < e.maxAttendees
    )!;
    Repository.rsvpEvent(joinable.id, INITIAL_CURRENT_USER.id);
    return joinable;
  };

  it('tapping the card opens the event info sheet; its buttons do not', () => {
    const joined = joinOne();
    render(React.createElement(MyPlansView, {}));
    fireEvent.click(screen.getByText(/^RSVPs \(1\)$/));

    fireEvent.click(screen.getByTestId('event-directions')); // a link: no sheet
    expect(screen.queryByTestId('rsvp-button')).toBeNull();

    fireEvent.click(screen.getByText(joined.title));
    expect(screen.getByTestId('rsvp-button').textContent).toContain('Tap to Leave');
  });

  it('can leave from the sheet as well as from the card', () => {
    const joined = joinOne();
    render(React.createElement(MyPlansView, {}));
    fireEvent.click(screen.getByText(/^RSVPs \(1\)$/));
    fireEvent.click(screen.getByText(joined.title));
    fireEvent.click(screen.getByTestId('rsvp-button'));

    expect(Repository.getEvents().find((e) => e.id === joined.id)!.attendees).not.toContain(INITIAL_CURRENT_USER.id);
    expect(screen.getByText(/^RSVPs \(0\)$/)).toBeDefined();
  });
});
