import { test, expect } from '@playwright/test';

test('sidebar remains open when user menu is active', async ({ page }) => {
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

  // Navigate to home
  await page.goto('http://localhost:8080/');

  // Locate the sidebar root element
  const sidebarRoot = page.locator('.group.peer[data-state]');

  // Ensure sidebar is visible
  await expect(sidebarRoot).toBeVisible();

  // Hover over sidebar to expand it
  await sidebarRoot.hover();
  await expect(sidebarRoot).toHaveAttribute('data-state', 'expanded');

  // Locate user menu trigger (avatar/button in footer)
  const userMenuTrigger = page.locator('[data-sidebar="footer"] button[data-sidebar="menu-button"]');

  // Click to open menu
  await userMenuTrigger.click();

  // Expect menu content to be visible
  const menuContent = page.locator('[role="menu"]'); // Radix UI dropdown content
  await expect(menuContent).toBeVisible();

  // Move mouse out of the sidebar area (e.g. to the center of the page)
  // Sidebar width is roughly 16rem (256px). Move to 500, 400.
  await page.mouse.move(500, 400);

  // The sidebar should REMAIN expanded because the menu is open
  await expect(sidebarRoot).toHaveAttribute('data-state', 'expanded');

  // Close the menu by clicking outside (at the current mouse position)
  await page.mouse.click(500, 400);

  // Menu should close
  await expect(menuContent).toBeHidden();

  // Sidebar should now collapse because mouse is outside and menu is closed
  // Note: Depending on implementation, it might wait for mouse movement or be immediate.
  // We might need to wiggle mouse or wait.
  // With the proposed fix (checking !isHovering when menu closes), it should collapse immediately.
  await expect(sidebarRoot).toHaveAttribute('data-state', 'collapsed');
});
