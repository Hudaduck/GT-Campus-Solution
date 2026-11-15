import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrandProvider, GEORGIA_TECH_BRAND } from '../../shared/config/brandConfig';
import { Repository, DEMO_STUDENT_USER, RECOMMENDED_MAX_COUNT } from '../../shared/data/repository';
import { EventsMapView } from './EventsMapView';

function renderMap(layout: 'phone' | 'web') {
  return render(
    React.createElement(BrandProvider, {
      initialConfig: GEORGIA_TECH_BRAND,
      children: React.createElement(EventsMapView, { layout }),
    })
  );
}

describe('Recommended For You (multi-factor ranking UI)', () => {
  beforeEach(() => {
    Repository.resetAllData();
    Repository.setCurrentUser(DEMO_STUDENT_USER);
  });

  it.each(['phone', 'web'] as const)('lists top matches in score order with reason pills (%s layout)', (layout) => {
    renderMap(layout);
    const section = screen.getByTestId('recommended-for-you');
    const cards = within(section).getAllByTestId(/^event-card-/);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(RECOMMENDED_MAX_COUNT);
    // The top pick is labelled #1 (Alex's own AI Founders pop-up is excluded: see below)
    expect(cards[0].getAttribute('data-testid')).toBe('event-card-event_fintech_alumni_dinner');
    expect(cards[0].textContent).toContain('#1 PICK');

    const scores = cards.map((c) => Number(/\((\d+) PTS\)/.exec(c.textContent || '')?.[1]));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it.each(['phone', 'web'] as const)("never recommends your own pop-up; it's listed under You're hosting (%s)", (layout) => {
    renderMap(layout);
    const picks = screen.getByTestId('recommended-for-you');
    expect(within(picks).queryByTestId('event-card-event_gt_ai_founders_coffee')).toBeNull();

    const hosting = screen.getByTestId('map-hosting');
    expect(hosting.textContent).toContain("You're hosting (1)");
    const card = within(hosting).getByTestId('event-card-event_gt_ai_founders_coffee');
    expect(card.textContent).not.toContain('PICK');
    expect(card.textContent).toContain('Hosting');
  });

  it('the full list view keeps your own pop-up out of the main list too', () => {
    renderMap('phone');
    fireEvent.click(screen.getByText(/View all \d+ events as list/));
    const hosting = screen.getByTestId('map-hosting');
    expect(screen.getAllByTestId('event-card-event_gt_ai_founders_coffee')).toHaveLength(1);
    expect(within(hosting).getByTestId('event-card-event_gt_ai_founders_coffee')).toBeDefined();
  });
});
