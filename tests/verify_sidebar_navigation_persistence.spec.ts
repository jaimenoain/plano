import { test, expect } from '@playwright/test';

test('sidebar remains open after navigation on desktop', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

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

  // Navigate to home (Feed)
  await page.goto('http://localhost:8080/');

  // Verify MainLayout is present
  await expect(page.getByTestId('main-layout')).toBeVisible();

  // Locate the sidebar root element
  const sidebarRoot = page.locator('.group.peer[data-state]');
  await expect(sidebarRoot).toBeVisible();

  // Hover over sidebar to expand it
  await sidebarRoot.hover();
  await expect(sidebarRoot).toHaveAttribute('data-state', 'expanded');

  // Locate "Explore" link in the sidebar
  const exploreLink = sidebarRoot.locator('a[href="/explore"]');

  // Click the link. This navigates to /explore.
  await exploreLink.click();

  // Wait for navigation
  await expect(page).toHaveURL(/.*\/explore/);

  // Assert that sidebar is STILL expanded.
  await expect(sidebarRoot).toHaveAttribute('data-state', 'expanded');
});
