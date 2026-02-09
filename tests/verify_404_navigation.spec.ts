import { test, expect } from '@playwright/test';

const mockUser = {
  id: "user1",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString()
};

test.describe('404 Page Navigation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to base url first to allow localStorage access
    await page.goto('http://localhost:8080/');

    // Inject auth token
    await page.evaluate((user) => {
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: "fake-token",
            refresh_token: "fake-refresh-token",
            user: user,
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600
        }));
    }, mockUser);
  });

  test('Desktop: Sidebar visible, BottomNav/Header hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    // Reload or navigate to apply auth state if needed, though simple navigation might work if app checks storage on load.
    // Navigate to 404 page
    await page.goto('http://localhost:8080/non-existent-page');

    // Wait for 404 content
    await expect(page.locator('text=404: Scope Reduction')).toBeVisible();

    // Check Sidebar (should be visible on desktop)
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Check BottomNav (should be HIDDEN on desktop)
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeHidden();

    // Check Header (should be HIDDEN on desktop)
    const header = page.locator('header.fixed.top-0');
    await expect(header).toBeHidden();
  });

  test('Mobile: Sidebar hidden, BottomNav/Header visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Navigate to 404 page
    await page.goto('http://localhost:8080/non-existent-page');

    // Wait for 404 content
    await expect(page.locator('text=404: Scope Reduction')).toBeVisible();

    // Check Sidebar (should be hidden on mobile)
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeHidden();

    // Check BottomNav (should be VISIBLE on mobile)
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();

    // Check Header (should be VISIBLE on mobile)
    const header = page.locator('header.fixed.top-0');
    await expect(header).toBeVisible();
  });

});
