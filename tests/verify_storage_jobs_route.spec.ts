import { test, expect } from '@playwright/test';

test('verify storage jobs route existence via unauthorized redirect', async ({ page }) => {
  // Mock authentication via LocalStorage
  const projectId = 'lnqxtomyucnnrgeapnzt';
  const session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'mock-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'tester@cineforum.eu',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      user_metadata: {
        onboarding_completed: true,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  await page.goto('/auth'); // Navigate to a page to set localStorage

  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: `sb-${projectId}-auth-token`, value: session });

  // Mock Supabase requests if necessary, but we really just want to test routing.
  // Ideally, AdminGuard checks useAuth which checks session.
  // But useAuth also calls getUser which hits the network.
  // So we might need to intercept network requests to return the user.

  // Intercept Supabase 'auth/v1/user' endpoint
  await page.route('**/auth/v1/user', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });

  // Intercept Profile fetch (useUserProfile)
  await page.route('**/rest/v1/profiles*', async route => {
     await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            id: 'mock-user-id',
            role: 'user', // Standard user, NOT admin
            username: 'tester',
        }),
     });
  });

  // Now navigate to the target route
  await page.goto('/admin/storage-jobs');

  // 5. Verify we are redirected to /admin/unauthorized OR we see "Permission Denied"
  const permissionDenied = page.getByText('Permission Denied', { exact: false });
  const notFound = page.getByText('404 Error', { exact: false });
  const pageNotFound = page.getByText('Page Not Found', { exact: false });

  // Wait for either to be visible
  await expect(permissionDenied.or(notFound).or(pageNotFound)).toBeVisible({ timeout: 10000 });

  if (await notFound.isVisible() || await pageNotFound.isVisible()) {
      throw new Error("Route /admin/storage-jobs returned 404 Not Found. The route is missing or not matching.");
  }

  await expect(permissionDenied).toBeVisible();
});
