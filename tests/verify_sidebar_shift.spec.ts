import { test, expect } from '@playwright/test';

test('search page content remains stable when sidebar is expanded', async ({ page }) => {
  page.on('console', msg => console.log(`CONSOLE: ${msg.text()}`));
  page.on('pageerror', exception => console.log(`Uncaught exception: "${exception}"`));

  // Mock Supabase Auth
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { onboarding_completed: true },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }),
    });
  });

  // Inject token
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sb-lnqxtomyucnnrgeapnzt-auth-token',
      JSON.stringify({
        access_token: 'header.payload.signature',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { onboarding_completed: true },
          app_metadata: {},
          aud: 'authenticated',
        },
      })
    );
  });

  // Set viewport to desktop
  await page.setViewportSize({ width: 1280, height: 800 });

  // Navigate to search page
  await page.goto('http://localhost:8080/search');

  // Locate the sidebar root element
  const sidebarRoot = page.locator('.group.peer[data-state]');
  await expect(sidebarRoot).toBeVisible();

  // Locate the Search content wrapper
  const wrapper = page.getByTestId('search-page-wrapper');
  await expect(wrapper).toBeVisible();

  // Get initial margin or X position
  // When collapsed, margin-left should be "0" (from style)
  // But wait, the style is inline.
  // collapsed: 5rem gap. wrapper margin: 0.
  // So wrapper starts at 5rem? No, SidebarInset handles the 5rem.
  // Wait, I wrapped AppLayout. AppLayout is inside SidebarInset (in MainLayout).
  // So wrapper is inside SidebarInset.
  // SidebarInset has padding-left or margin-left equal to sidebar gap.

  // Let's check computed style.
  const getMarginLeft = async () => {
    return await wrapper.evaluate((el) => window.getComputedStyle(el).marginLeft);
  };

  const initialMargin = await getMarginLeft();
  console.log('Initial Margin:', initialMargin);
  expect(initialMargin).toBe('0px');

  // Hover over sidebar to expand it
  await sidebarRoot.hover();
  await expect(sidebarRoot).toHaveAttribute('data-state', 'expanded');

  // Wait for transition if any (sidebar expansion has transition)
  await page.waitForTimeout(500);

  // Get new margin
  const expandedMargin = await getMarginLeft();
  console.log('Expanded Margin:', expandedMargin);

  // Should remain 0px (no shift)
  expect(expandedMargin).toBe(initialMargin);
});

test('search page content does not shift on mobile', async ({ page }) => {
  // Mock Supabase Auth
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { onboarding_completed: true },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }),
    });
  });

  // Inject token
  await page.addInitScript(() => {
     window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { onboarding_completed: true }, aud: 'authenticated' }
     }));
  });

  // Set viewport to mobile
  await page.setViewportSize({ width: 375, height: 667 });

  // Navigate to search page
  await page.goto('http://localhost:8080/search');

  const wrapper = page.getByTestId('search-page-wrapper');
  await expect(wrapper).toBeVisible();

  const margin = await wrapper.evaluate((el) => window.getComputedStyle(el).marginLeft);
  console.log('Mobile Margin:', margin);

  expect(margin).toBe('0px');
});
