import { test, expect } from '@playwright/test';

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
    await expect(page.locator('text=LinkedIn Verified')).toBeVisible();
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
    await expect(page.locator('text=Host a Campus Pop-Up')).toBeVisible();

    // Fill in title and location
    await page.fill('[data-testid="event-title-input"]', 'Midtown Hackathon & Coffee');
    await page.fill('[data-testid="event-location-input"]', 'Tech Square Lounge');

    // Submit
    const createBtn = page.locator('[data-testid="publish-event-button"]');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify drawer closed and event was created
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
    const download = page.waitForEvent('download');
    await page.locator('button:has-text("Confirm & Download .ics Meetup")').click();
    expect((await download).suggestedFilename()).toMatch(/\.ics$/);
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

  test('Flow 6: Mutual Match -> schedule an in-person midpoint coffee directly', async ({ page }) => {
    await page.locator('[data-testid="nav-tab-swipe"]').click();
    await page.locator('button[title="Connect & Meet"]').first().click();
    await expect(page.locator("text=It's a Mutual Match!")).toBeVisible();
    await page.locator('button', { hasText: 'Schedule a Meetup' }).click();

    // In person is the default format
    await expect(page.locator('[data-testid="format-in-person"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('text=Dancing Goats Coffee Bar')).toBeVisible();
    const download = page.waitForEvent('download');
    await page.locator('button:has-text("Confirm & Download .ics Meetup")').click();
    await download;
    await expect(page.locator('text=Meetup Confirmed!')).toBeVisible();
    await page.locator('button', { hasText: 'Back to ThirdPlace' }).click();

    await page.locator('[data-testid="nav-tab-plans"]').click();
    await expect(page.locator('text=Dancing Goats Coffee Bar').first()).toBeVisible();
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
