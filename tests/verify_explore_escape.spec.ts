import { test, expect } from '@playwright/test';

test('verify escape key in explore mode', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 1. Mock Authentication
  await page.addInitScript(() => {
    const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQifQ.signature";
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: fakeJwt,
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: {
                onboarding_completed: true
            }
        }
    }));
  });

  // Mock User
  await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: "user-uuid",
              email: "test@example.com",
              role: "authenticated",
              aud: "authenticated",
              user_metadata: {
                onboarding_completed: true
              }
          })
      });
  });

  // Mock Profile
  await page.route('**/rest/v1/profiles*', async route => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            id: "user-uuid",
            username: "testuser",
            full_name: "Test User",
            onboarding_completed: true
        })
    });
  });

  // Mock Notifications (Header)
  await page.route('**/rest/v1/notifications*', async route => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
    });
  });

  // Mock Discovery Feed (Explore Page)
  await page.route('**/rest/v1/rpc/get_discovery_feed*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'building-1',
          name: 'Test Building',
          city: 'New York',
          country: 'USA',
          main_image_url: 'http://example.com/image.jpg',
          architects: [{ name: 'Test Architect' }],
          hero_image_url: 'http://example.com/image.jpg'
        }
      ])
    });
  });

  // Mock Main Feed (Index Page) - empty
  await page.route('**/rest/v1/rpc/get_feed*', async route => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
    });
  });

  // Navigate to Explore
  await page.goto('http://localhost:8080/explore');

  // Wait for content to load
  await expect(page.getByText('Test Building')).toBeVisible({ timeout: 10000 });

  // Verify URL is explore
  expect(page.url()).toContain('/explore');

  // Open Filter Sheet
  const filterBtn = page.getByRole('button', { name: 'Filter' });
  await filterBtn.click();
  await expect(page.getByText('Filters')).toBeVisible();

  // Press Escape - should close filter
  await page.keyboard.press('Escape');

  // Filter should close
  await expect(page.getByText('Filters')).not.toBeVisible();
  // Should stay on explore
  expect(page.url()).toContain('/explore');

  // Press Escape again
  await page.keyboard.press('Escape');

  // Should navigate to Home
  // Wait for navigation
  await page.waitForURL('http://localhost:8080/');
  expect(page.url()).toBe('http://localhost:8080/');
});
