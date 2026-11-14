import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    // Highest-scoring event for the demo student comes first and is labelled #1
    expect(cards[0].getAttribute('data-testid')).toBe('event-card-event_gt_ai_founders_coffee');
    expect(cards[0].textContent).toContain('#1 PICK');
    expect(cards[0].textContent).toContain('2 Shared Hobbies');
    expect(cards[0].textContent).toContain("Elena ('20 @ Anthropic)");

    const scores = cards.map((c) => Number(/\((\d+) PTS\)/.exec(c.textContent || '')?.[1]));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
