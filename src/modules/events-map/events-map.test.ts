import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { BrandProvider, GEORGIA_TECH_BRAND } from '../../shared/config/brandConfig';
import { Repository, scoreEventByHobbiesAndNetwork, INITIAL_CURRENT_USER } from '../../shared/data/repository';
import { EventsMapView } from './EventsMapView';
import { EventDetailDrawer } from './EventDetailDrawer';
import { EventListView } from './EventListView';
import { createGTMarkerIcon } from './MapContainerView';
import { ScoredEventItem } from './types';

// Helper wrapper with BrandProvider
function renderWithBrand(ui: React.ReactElement) {
  return render(
    React.createElement(BrandProvider, { initialConfig: GEORGIA_TECH_BRAND, children: ui })
  );
}

describe('EventsMapView Module', () => {
  beforeEach(() => {
    Repository.resetAllData();
    vi.clearAllMocks();
  });

  it('renders EventsMapView header, search input, and view toggles', () => {
    renderWithBrand(React.createElement(EventsMapView));

    expect(screen.getByTestId('events-map-view')).toBeDefined();
    expect(screen.getByText('Campus Map Radar')).toBeDefined();
    expect(screen.getByTestId('events-search-input')).toBeDefined();
    expect(screen.getByTestId('view-toggle-map')).toBeDefined();
    expect(screen.getByTestId('view-toggle-list')).toBeDefined();
    expect(screen.getByTestId('view-toggle-grid')).toBeDefined();
    expect(screen.getByTestId('open-host-event-button')).toBeDefined();
  });

  it('ranks and highlights recommended events using scoreEventByHobbiesAndNetwork()', () => {
    const user = Repository.getCurrentUser();
    const events = Repository.getEvents();
    
    // Pick first event and verify score
    const score = scoreEventByHobbiesAndNetwork(events[0], user);
    expect(typeof score).toBe('number');

    renderWithBrand(React.createElement(EventsMapView));

    // Switch to list view
    const listToggle = screen.getByTestId('view-toggle-list');
    fireEvent.click(listToggle);

    // Filter by Recommended
    const recFilter = screen.getByTestId('filter-recommended');
    fireEvent.click(recFilter);

    // Verify recommended badge text exists in filtered list
    const buzzBadges = screen.getAllByText(/BUZZ MATCH/i);
    expect(buzzBadges.length).toBeGreaterThan(0);
  });

  it('supports toggleable List and Grid views seamlessly', () => {
    renderWithBrand(React.createElement(EventsMapView));

    // Toggle Grid view
    const gridToggle = screen.getByTestId('view-toggle-grid');
    fireEvent.click(gridToggle);
    expect(gridToggle.className).toContain('text-tp-accent');

    // Toggle List view
    const listToggle = screen.getByTestId('view-toggle-list');
    fireEvent.click(listToggle);
    expect(listToggle.className).toContain('text-tp-accent');
  });

  it('renders tile error fallback banner when map tiles fail', () => {
    const mockEvents: ScoredEventItem[] = [
      {
        ...Repository.getEvents()[0],
        score: 40,
        isRecommended: true,
        sharedHobbies: ['AI startups'],
      },
    ];

    renderWithBrand(
      React.createElement(EventListView, {
        events: mockEvents,
        currentUser: INITIAL_CURRENT_USER,
        viewMode: 'list',
        hasTileError: true,
        onSelectEvent: vi.fn(),
        onRsvpSuccess: vi.fn(),
      })
    );

    const banner = screen.getByTestId('tile-error-banner');
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain('Map tiles restricted or unavailable');
  });

  it('opens EventDetailDrawer on event selection, displays spots counter, and handles 1-tap RSVP', async () => {
    const initialEvents = Repository.getEvents();
    const testEvent = initialEvents[0];
    const initialAttendeeCount = testEvent.attendees.length;

    renderWithBrand(React.createElement(EventsMapView));

    // Switch to List view
    fireEvent.click(screen.getByTestId('view-toggle-list'));

    // Click on event card
    const card = screen.getByTestId(`event-card-${testEvent.id}`);
    fireEvent.click(card);

    // Drawer should now be visible
    expect(screen.getByTestId('event-detail-drawer')).toBeDefined();
    expect(screen.getByTestId('spots-remaining')).toBeDefined();

    // Find and click RSVP button
    const rsvpButton = screen.getByTestId('rsvp-button');
    expect(rsvpButton).toBeDefined();

    await act(async () => {
      fireEvent.click(rsvpButton);
    });

    // Check Repository update
    const updatedEvents = Repository.getEvents();
    const updated = updatedEvents.find((e) => e.id === testEvent.id);
    expect(updated).toBeDefined();
    // Attendee count should have changed
    expect(updated!.attendees.length).not.toBe(initialAttendeeCount);
  });

  it('copies shareable link to clipboard from EventDetailDrawer', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    const mockEvent: ScoredEventItem = {
      ...Repository.getEvents()[0],
      score: 50,
      isRecommended: true,
      sharedHobbies: ['running'],
    };

    renderWithBrand(
      React.createElement(EventDetailDrawer, {
        event: mockEvent,
        currentUser: INITIAL_CURRENT_USER,
        isOpen: true,
        onClose: vi.fn(),
        onRsvpSuccess: vi.fn(),
      })
    );

    const shareButton = screen.getByTestId('share-link-button');
    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(screen.getByText(/Link Copied to Clipboard/i)).toBeDefined();
  });

  it('schedules a pop-up for a chosen date/time instead of making it live now', async () => {
    renderWithBrand(React.createElement(EventsMapView));
    fireEvent.click(screen.getByTestId('open-host-event-button'));
    expect(screen.getByText('Schedule a Campus Pop-Up')).toBeDefined();

    fireEvent.change(screen.getByTestId('event-title-input'), { target: { value: 'Midnight Tech Green Star Gazing' } });
    fireEvent.change(screen.getByTestId('event-location-input'), { target: { value: 'Tech Green Lawn' } });

    // Tomorrow at 9:00 PM, for 3 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ymd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    fireEvent.change(screen.getByTestId('event-date-input'), { target: { value: ymd } });
    fireEvent.change(screen.getByTestId('event-time-input'), { target: { value: '21:00' } });
    fireEvent.click(screen.getByTestId('duration-option-3'));
    expect(screen.getByTestId('event-start-preview').textContent).toMatch(/Starts tomorrow · 9:00/);
    expect(screen.getByTestId('publish-event-button').textContent).toMatch(/Schedule Pop-Up · tomorrow · 9:00/);

    await act(async () => {
      fireEvent.click(screen.getByTestId('publish-event-button'));
    });

    const created = Repository.getEvents().find((e) => e.title === 'Midnight Tech Green Star Gazing')!;
    expect(created).toBeDefined();
    const start = new Date(created.startTime);
    expect(start.getDate()).toBe(tomorrow.getDate());
    expect(start.getHours()).toBe(21);
    expect(new Date(created.endTime).getTime() - start.getTime()).toBe(3 * 60 * 60 * 1000);
    expect(created.expiresAt).toBe(new Date(created.endTime).getTime()); // leaves the map when it ends
    expect(created.ttlHours).toBe(3);
  });

  it('rejects a start time in the past', () => {
    renderWithBrand(React.createElement(EventsMapView));
    fireEvent.click(screen.getByTestId('open-host-event-button'));
    fireEvent.change(screen.getByTestId('event-title-input'), { target: { value: 'Too Late Meetup' } });
    fireEvent.change(screen.getByTestId('event-location-input'), { target: { value: 'CULC' } });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ymd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    fireEvent.change(screen.getByTestId('event-date-input'), { target: { value: ymd } });
    fireEvent.click(screen.getByTestId('publish-event-button'));
    expect(screen.getByText('Pick a start time in the future')).toBeDefined();
    expect(Repository.getEvents().some((e) => e.title === 'Too Late Meetup')).toBe(false);
  });

  it('generates high-contrast Leaflet divIcon with Navy (#051E39) and Gold (#B39051)', () => {
    const mockEvent: ScoredEventItem = {
      ...Repository.getEvents()[0],
      score: 45,
      isRecommended: true,
      sharedHobbies: ['pour-over coffee'],
      isHostAlum: true,
    };

    const icon = createGTMarkerIcon(mockEvent);
    expect(icon).toBeDefined();
    expect(icon.options.html).toContain('#051E39');
    expect(icon.options.html).toContain('#B39051');
    expect(icon.options.html).toContain('<svg'); // lucide category + star icons, no emoji
    expect(icon.options.html).toContain(`data-category="${mockEvent.category}"`);
    expect(icon.options.html).not.toMatch(/[\u{1F300}-\u{1FAFF}★]/u);
    expect(icon.options.html).toContain('GT');
  });

  it('filters events to the location radius and offers to widen it when nothing is in range', () => {
    const total = Repository.getEvents().length;
    renderWithBrand(React.createElement(EventsMapView));
    // Default: Georgia Tech Campus within 5 mi covers every Midtown pop-up
    expect(screen.getByText(new RegExp(`${total} Events within 5 mi`))).toBeDefined();

    // Decatur, 0.5 mi: nothing nearby
    fireEvent.click(screen.getByTestId('location-chip'));
    fireEvent.change(screen.getByTestId('location-area'), { target: { value: 'decatur' } });
    fireEvent.click(screen.getByTestId('radius-0.5'));
    fireEvent.click(screen.getByTestId('location-done'));
    expect(screen.getByTestId('no-events-in-radius').textContent).toContain('No pop-ups within 0.5 mi of Decatur');
    expect(screen.getByText(/0 Events within 0.5 mi/)).toBeDefined();

    fireEvent.click(screen.getByText('Show anywhere'));
    expect(screen.queryByTestId('no-events-in-radius')).toBeNull();
    expect(screen.getByText(new RegExp(`^${total} Events$`))).toBeDefined();
    expect(Repository.getCurrentUser().locationPreference).toMatchObject({ areaId: 'decatur', radiusMiles: null });
  });

  it("shows each event's distance from your area in the list", () => {
    renderWithBrand(React.createElement(EventsMapView));
    fireEvent.click(screen.getByTestId('view-toggle-list'));
    const distances = screen.getAllByTestId('event-distance').map((d) => d.textContent);
    expect(distances.length).toBeGreaterThan(0);
    expect(distances.every((d) => /\d(\.\d)? mi$/.test(d ?? ''))).toBe(true);
  });
});
