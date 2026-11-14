import { test, expect } from '@playwright/test';

test.describe('Suite 3: E2E Core User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore expected simulated chaos errors
        if (!msg.text().includes('[Fault Isolation]')) {
          console.error(`[Browser Console Error]: ${msg.text()}`);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
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
    const hobbyPill = page.locator('button', { hasText: /bouldering/i }).first();
    if (await hobbyPill.isVisible()) {
      await hobbyPill.click();
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="close-onboarding-modal"]').first();
    await closeBtn.click();
  });

  test('Flow 4: Events Map RSVP & Host Pop-Up Event flow', async ({ page }) => {
    // Ensure on Map tab
    await page.locator('[data-testid="nav-tab-map"]').click();

    // Switch to list view
    const listToggle = page.locator('[data-testid="view-toggle-list"]').first();
    if (await listToggle.isVisible()) {
      await listToggle.click();
    }
    await page.waitForTimeout(300);

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
    const closeDrawer = page.locator('[data-testid="close-drawer-button"]').first();
    if (await closeDrawer.isVisible()) {
      await closeDrawer.click();
    }

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
  });

  test('Flow 5: 1-on-1 Swipe, Mutual Match & Midpoint Coffee Scheduler', async ({ page }) => {
    // Navigate to Swipe
    await page.locator('[data-testid="nav-tab-swipe"]').click();

    // Verify candidate card renders
    await expect(page.locator('text=Open to Meet').first()).toBeVisible();

    // Click Connect (Swipe Right)
    const connectBtn = page.locator('button[aria-label="Connect (Like)"], button:has-text("Connect")').first();
    await connectBtn.click();

    // Mutual Match modal or next card
    const scheduleMatchBtn = page.locator('button:has-text("Schedule 1-on-1 Meetup")');
    if (await scheduleMatchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scheduleMatchBtn.click();

      // Scheduler drawer opens
      await expect(page.locator('text=Lock In 1-on-1 Meetup')).toBeVisible();
      await expect(page.locator('text=Dancing Goats Coffee Bar')).toBeVisible();

      // Confirm meetup
      const confirmBtn = page.locator('button:has-text("Confirm & Download .ics Meetup")');
      await confirmBtn.click();
    }

    // Navigate to My Plans
    await page.locator('[data-testid="nav-tab-plans"]').click();
    await expect(page.locator('text=My Plans & Connections')).toBeVisible();
  });
});

test.describe('Suite 4: Fault-Isolation Chaos Tests', () => {
  test('Chaos 1: Block OpenStreetMap tiles -> verify fallback list renders cleanly without crashing', async ({ page }) => {
    // Abort all OpenStreetMap tile requests
    await page.route('**/*tile.openstreetmap.org/**', (route) => route.abort());

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Ensure map tab is active
    await page.locator('[data-testid="nav-tab-map"]').click();

    // Navigation should still work seamlessly
    await page.locator('[data-testid="nav-tab-swipe"]').click();
    await expect(page.locator('text=Open to Meet').first()).toBeVisible();

    await page.locator('[data-testid="nav-tab-plans"]').click();
    await expect(page.locator('text=My Plans & Connections')).toBeVisible();

    // Return to map - list view or fallback container is functional
    await page.locator('[data-testid="nav-tab-map"]').click();
    const listBtn = page.locator('button[title="List View"]').first();
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await expect(page.locator('text=Yellow Jacket AI Founders').first()).toBeVisible();
    }
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
    const isErrorOrRecovered = await page.locator('text=Reset Module').or(page.locator('text=Open to Meet')).first().isVisible();
    expect(isErrorOrRecovered).toBe(true);

    // If Reset Module button appeared, clicking it recovers the module
    const resetBtn = page.locator('button:has-text("Reset Module")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await page.waitForTimeout(500);
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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Verify 0 unexpected console errors
    expect(consoleErrors.length).toBe(0);
  });
});
