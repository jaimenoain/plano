import { test, expect } from '@playwright/test';

test('sidebar text elements are hidden when collapsed', async ({ page }) => {
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

  // Navigate to home
  await page.goto('http://localhost:8080/');

  // Locate the sidebar root element that has the data-state attribute
  const sidebarRoot = page.locator('.group.peer[data-state]');

  // Ensure sidebar is visible (desktop)
  await expect(sidebarRoot).toBeVisible();

  // Check current state. If expanded, collapse it.
  const state = await sidebarRoot.getAttribute('data-state');
  if (state === 'expanded') {
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click();
    await expect(sidebarRoot).toHaveAttribute('data-state', 'collapsed');
  } else {
    await expect(sidebarRoot).toHaveAttribute('data-state', 'collapsed');
  }

  // Verify "Feed" text label is hidden
  // The structure is Link > Icon + Span.
  // We want to verify the span is hidden.
  // Note: .getByRole('link', { name: 'Feed' }) might verify accessibility name which could still be 'Feed' if the text is just visually hidden?
  // CSS display: none (via hidden class) removes it from accessibility tree too usually.
  // But let's look for the span explicitly.

  // We look for the link that points to "/" inside the sidebar
  const feedLink = sidebarRoot.locator('a[href="/"]');
  const feedSpan = feedLink.locator('span').filter({ hasText: 'Feed' });

  await expect(feedSpan).toBeHidden();

  // Verify UserMenu text is hidden
  // The user menu shows "test@example.com" inside a span, which is inside the hidden div.
  const userEmail = sidebarRoot.getByText('test@example.com');
  await expect(userEmail).toBeHidden();

  // Verify Chevron is hidden
  // It's in the footer, inside a button.
  const footerButton = sidebarRoot.locator('[data-sidebar="footer"] button[data-sidebar="menu-button"]');
  const chevron = footerButton.locator('.lucide-chevrons-up-down');
  await expect(chevron).toBeHidden();

  // Verify Avatar is centered
  // We check if the button has justify-center class.
  await expect(footerButton).toHaveClass(/justify-center/);
});
