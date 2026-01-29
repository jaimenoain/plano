import { test, expect } from '@playwright/test';

const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

test('Unauthenticated user is redirected to auth', async ({ page }) => {
  // Clear any potential auth
  await page.goto('http://localhost:8080/');
  await page.evaluate(() => localStorage.clear());

  await page.goto('http://localhost:8080/explore');

  // Expect redirection to /auth
  await expect(page).toHaveURL(/.*\/auth/);
});

test('Authenticated user sees content', async ({ page }) => {
  // Mock Session
  await page.addInitScript((token) => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: token,
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated"
        }
    }));
  }, DUMMY_JWT);

  // Mock get_discovery_feed RPC
  await page.route('**/rest/v1/rpc/get_discovery_feed*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
              {
                  id: "building-1",
                  name: "Test Building",
                  address: "123 Test St",
                  city: "Test City",
                  country: "Test Country",
                  year_completed: 2020,
                  slug: "test-building",
                  main_image_url: "https://example.com/image.jpg",
                  save_count: 10
              }
          ])
      });
  });

  // Mock profiles query (used by useUserProfile)
   await page.route('**/rest/v1/profiles*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: "user-uuid",
            username: "testuser",
            bio: "Test bio",
            avatar_url: null,
            country: "Test Country",
            location: "Test City",
            subscribed_platforms: [],
            role: "user"
          })
      });
  });

  // Mock image queries just in case
  await page.route('**/*.jpg*', async route => {
      await route.abort();
  });


  await page.goto('http://localhost:8080/explore');

  // Loader should eventually disappear
  const loader = page.locator('.animate-spin').first();
  await expect(loader).toBeHidden({ timeout: 10000 });

  // Content should appear
  await expect(page.getByText('Test Building')).toBeVisible();
});
