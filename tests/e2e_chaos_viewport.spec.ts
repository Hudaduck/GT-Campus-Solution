import { test, expect } from '@playwright/test';


// Catch the Google Calendar tab the app opens: answer it locally (no real Google / sign-in redirect)
// and hand back the exact pre-filled URL the app used.
async function captureGoogleCalendar(page: import('@playwright/test').Page, click: () => Promise<void>): Promise<URL> {
  let captured = '';
  await page.context().route('https://calendar.google.com/**', async (route) => {
    captured = route.request().url();
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google Calendar (stub)</title>' });
  });
  const tab = page.context().waitForEvent('page');
  await click();
  const gcal = await tab;
  await expect.poll(() => captured).not.toBe('');
  await gcal.close();
  await page.context().unroute('https://calendar.google.com/**');
  return new URL(captured);
}

test.describe('Suite 3: E2E Core User Flows', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Collect unexpected console errors (simulated chaos errors are tagged [Fault Isolation])
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('[Fault Isolation]')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(() => {
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('Flow 1: Header renders ThirdPlace brand and Georgia Tech tokens', async ({ page }) => {
    await expect(page.locator('text=ThirdPlace')).toBeVisible();
    await expect(page.locator('text=Georgia Tech').first()).toBeVisible();
    await expect(page.locator('text=Your Campus, Everywhere')).toBeVisible();
  });

  test('Flow 2: Student/Alumni Demo Switcher toggles persona and verification badges', async ({ page }) => {
    const studentBtn = page.locator('button', { hasText: /Student/i }).first();
    const alumBtn = page.locator('button', { hasText: /Alum/i }).first();

    await expect(studentBtn).toBeVisible();
    await expect(alumBtn).toBeVisible();

    // Click Student
    await studentBtn.click();
    await expect(page.locator('text=Student SSO')).toBeVisible();

    // Click Alum
    await alumBtn.click();
    await expect(page.locator('text=LinkedIn Linked')).toBeVisible();
  });

  test('Flow 3: Onboarding modal opens and allows completing profile', async ({ page }) => {
    // Open onboarding modal using visible button (responsive)
    const onboardingBtn = page.locator('button:has-text("Onboarding"):visible, button[aria-label="Profile Onboarding"]:visible').first();
    await onboardingBtn.click();

    await expect(page.locator('[data-testid="onboarding-modal"]')).toBeVisible();
    await expect(page.locator('text=Fast Onboarding')).toBeVisible();

    // Toggle a hobby pill (e.g. bouldering)
    const hobbyPill = page.locator('[data-testid="onboarding-modal"] button', { hasText: /bouldering/i }).first();
    await expect(hobbyPill).toBeVisible();
    await hobbyPill.click();

    // Close modal
    const closeBtn = page.locator('[data-testid="close-onboarding-modal"]').first();
    await closeBtn.click();
  });

  test('Flow 4: Events Map RSVP & Host Pop-Up Event flow', async ({ page }) => {
    // Ensure on Map tab
    await page.locator('[data-testid="nav-tab-map"]').click();

    // Switch to list view
    await page.locator('[data-testid="view-toggle-list"]').first().click();

    // Find and click first event card
    const eventCard = page.locator('[data-testid^="event-card-"]').first();
    await expect(eventCard).toBeVisible();
    await eventCard.click();

    // RSVP Drawer should open
    const drawer = page.locator('[data-testid="event-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Click 1-tap RSVP button
    const rsvpBtn = page.locator('[data-testid="rsvp-button"]').first();
    await expect(rsvpBtn).toBeVisible();
    await rsvpBtn.click();

    // Close detail drawer
    await page.locator('[data-testid="close-drawer-button"]').first().click();
    await expect(drawer).not.toBeVisible();

    // Open Host Event Drawer
    const hostBtn = page.locator('[data-testid="open-host-event-button"]').first();
    await expect(hostBtn).toBeVisible();
    await hostBtn.click();

    // Host Drawer opens
    await expect(page.locator('text=Schedule a Campus Pop-Up')).toBeVisible();

    // Fill in title and location
    await page.fill('[data-testid="event-title-input"]', 'Midtown Hackathon & Coffee');
    await page.fill('[data-testid="event-location-input"]', 'Tech Square Lounge');

    // Submit
    const createBtn = page.locator('[data-testid="publish-event-button"]');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify drawer closed and event was created
    await expect(page.locator('text=Schedule a Campus Pop-Up')).not.toBeVisible();
    await expect(page.locator('text=Host a Campus Pop-Up')).not.toBeVisible();
    await expect(page.locator('text=Midtown Hackathon & Coffee').first()).toBeVisible();
  });

  test('Flow 5: Mutual Match -> message first -> schedule an online meetup', async ({ page }) => {
    await page.locator('[data-testid="nav-tab-swipe"]').click();
    await expect(page.locator('text=Open to Meet').first()).toBeVisible();

    // Swipe right -> mutual match
    await page.locator('button[title="Connect & Meet"]').first().click();
    await expect(page.locator("text=It's a Mutual Match!")).toBeVisible();
    await page.locator('button', { hasText: 'Send a Message' }).click();

    // Chat: send a message, see the typing indicator resolve into the partner's reply
    const chat = page.locator('[data-testid="chat-drawer"]');
    await expect(chat).toBeVisible();
    // Scheduling is locked until both people have talked
    await expect(chat.locator('[data-testid="plan-online"]')).toBeDisabled();
    await expect(chat.locator('[data-testid="plan-in-person"]')).toBeDisabled();
    await chat.getByLabel('Message', { exact: true }).fill('Hi! Want to chat about your work sometime?');
    await chat.getByLabel('Message', { exact: true }).press('Enter');
    await expect(chat.locator('[data-testid="chat-message-mine"]')).toHaveCount(1);
    await expect(chat.locator('[data-testid="chat-message-theirs"]')).toHaveCount(1, { timeout: 5000 });
    await expect(chat.locator('[data-testid="chat-message-theirs"]')).toContainText('video call');

    // Decide to meet online
    await chat.locator('[data-testid="plan-online"]').click();
    await expect(page.locator('[data-testid="format-online"]')).toHaveAttribute('aria-checked', 'true');
    await page.locator('button', { hasText: 'Zoom' }).click();
    await page.getByLabel(/Meeting link/).fill('zoom.us/j/123456789');
    // Confirm opens a pre-filled Google Calendar event in a new tab (no .ics download)
    const gcalUrl = await captureGoogleCalendar(page, () =>
      page.locator('button:has-text("Confirm & Add to Google Calendar")').click()
    );
    expect(gcalUrl.hostname).toBe('calendar.google.com');
    expect(gcalUrl.searchParams.get('action')).toBe('TEMPLATE');
    expect(gcalUrl.searchParams.get('details')).toContain('https://zoom.us/j/123456789');
    await expect(page.locator('text=Meetup Confirmed!')).toBeVisible();

    // Back in the chat, the plan is recorded in the thread
    await page.locator('button', { hasText: 'Back to ThirdPlace' }).click();
    await expect(chat).toContainText('video call on Zoom');
    await page.getByLabel('Close chat').click();

    // My Plans lists it as an online meetup with a join link
    await page.locator('[data-testid="nav-tab-plans"]').click();
    await expect(page.locator('text=My Plans & Connections')).toBeVisible();
    await expect(page.locator('text=Online').first()).toBeVisible();
    await expect(page.locator('a', { hasText: 'Join meeting' })).toHaveAttribute('href', 'https://zoom.us/j/123456789');
  });

  test('Flow 6: Mutual Match -> talk first -> meet in person at your own address', async ({ page }) => {
    await page.locator('[data-testid="nav-tab-swipe"]').click();
    await page.locator('button[title="Connect & Meet"]').first().click();
    await expect(page.locator("text=It's a Mutual Match!")).toBeVisible();

    // A fresh match only offers messaging, not scheduling
    await expect(page.locator('[role="dialog"] button', { hasText: /Schedule/ })).toHaveCount(0);
    await page.locator('button', { hasText: 'Send a Message' }).click();

    const chat = page.locator('[data-testid="chat-drawer"]');
    await chat.getByLabel('Message', { exact: true }).fill('Want to meet up this week?');
    await chat.getByLabel('Message', { exact: true }).press('Enter');
    await expect(chat.locator('[data-testid="chat-message-mine"]')).toHaveCount(1);
    await expect(chat.locator('[data-testid="chat-message-theirs"]')).toHaveCount(1, { timeout: 5000 });
    await chat.locator('[data-testid="plan-in-person"]').click();

    // Recommended spots are offered, plus "Somewhere else" with a custom address
    await expect(page.locator('[data-testid="format-in-person"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('text=Recommended Spots')).toBeVisible();
    await expect(page.locator('text=Dancing Goats Coffee Bar')).toBeVisible();
    await page.locator('[data-testid="spot-custom"]').click();
    const confirmBtn = page.locator('button:has-text("Confirm & Add to Google Calendar")');
    await expect(confirmBtn).toBeDisabled();
    await page.getByLabel(/Place name/).fill('Piedmont Park');
    await page.getByLabel(/^Address/).fill('400 Park Dr NE, Atlanta, GA');

    // A 2-hour meetup; Confirm opens Google Calendar with the right length
    await page.locator('[data-testid="meetup-duration-120"]').click();
    const gcalUrl = await captureGoogleCalendar(page, () => confirmBtn.click());
    const [start, end] = gcalUrl.searchParams.get('dates')!.split('/');
    const toMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13));
    expect(toMs(end) - toMs(start)).toBe(2 * 60 * 60 * 1000);
    expect(gcalUrl.searchParams.get('location')).toContain('400 Park Dr NE');
    await expect(page.locator('text=Meetup Confirmed!')).toBeVisible();
    await page.locator('button', { hasText: 'Back to ThirdPlace' }).click();
    await expect(chat).toContainText('meetup at Piedmont Park (400 Park Dr NE, Atlanta, GA)');
    await page.getByLabel('Close chat').click();

    await page.locator('[data-testid="nav-tab-plans"]').click();
    await expect(page.locator('text=Piedmont Park').first()).toBeVisible();
    await expect(page.locator('text=400 Park Dr NE, Atlanta, GA').first()).toBeVisible();
    await expect(page.locator('text=In person').first()).toBeVisible();
  });
});

test.describe('Suite 4: Fault-Isolation Chaos Tests', () => {
  test('Chaos 1: Block OpenStreetMap tiles -> verify fallback list renders cleanly without crashing', async ({ page }) => {
    // Abort all OpenStreetMap tile requests
    await page.route('**/*tile.openstreetmap.org/**', (route) => route.abort());

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Failed tiles auto-switch the map to the list fallback with a notice
    await page.locator('[data-testid="nav-tab-map"]').click();
    await expect(page.locator('[data-testid="tile-error-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid^="event-card-"]').first()).toBeVisible();

    // Navigation should still work seamlessly
    await page.locator('[data-testid="nav-tab-swipe"]').click();
    await expect(page.locator('text=Open to Meet').first()).toBeVisible();

    await page.locator('[data-testid="nav-tab-plans"]').click();
    await expect(page.locator('text=My Plans & Connections')).toBeVisible();

    // Return to map - the list fallback is functional
    await page.locator('[data-testid="nav-tab-map"]').click();
    await page.locator('[data-testid="view-toggle-list"]').click();
    await expect(page.locator('[data-testid^="event-card-"]').first()).toBeVisible();
  });

  test('Chaos 2: Corrupted JSON in localStorage -> ModuleErrorBoundary isolates fault with Reset Module', async ({ page }) => {
    await page.goto('/');

    // Corrupt matches or profiles storage
    await page.evaluate(() => {
      localStorage.setItem('thirdplace_profiles_data', '{ corrupted json! invalid syntax');
    });

    // Reload page
    await page.reload();

    // Map radar remains functional
    await page.locator('[data-testid="nav-tab-map"]').click();
    await expect(page.locator('text=ThirdPlace')).toBeVisible();

    // Navigate to swipe: either handles gracefully via repository fallback or catches in ModuleErrorBoundary
    await page.locator('[data-testid="nav-tab-swipe"]').click();
    await expect(page.locator('text=Reset Module').or(page.locator('text=Open to Meet')).first()).toBeVisible();

    // If Reset Module button appeared, clicking it recovers the module
    const resetBtn = page.locator('button:has-text("Reset Module")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await expect(page.locator('text=Open to Meet').first()).toBeVisible();
    }
  });
});

test.describe('Suite 5: Viewport, Contrast & Console Audit', () => {
  test('Mobile Viewport (390x844) Audit: No horizontal overflow & 0 console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('[Fault Isolation]')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('[data-testid="events-map-view"]')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Verify 0 unexpected console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('Desktop Viewport (1440x900) Audit: No horizontal overflow & 0 console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('[Fault Isolation]')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-testid="events-map-view"]')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Verify 0 unexpected console errors
    expect(consoleErrors.length).toBe(0);
  });
});
