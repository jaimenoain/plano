import { test, expect } from '@playwright/test';

// JWT and User mocks
const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjk5OTk5OTk5OTl9.dummy_signature";
const MOCK_USER = {
  id: "user-uuid",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2020-01-01T00:00:00Z",
  user_metadata: { onboarding_completed: true },
};

test.describe('Root Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Auth
    await page.route('**/auth/v1/user', async (route) => route.fulfill({ status: 200, body: JSON.stringify(MOCK_USER) }));
    await page.route('**/auth/v1/token?*', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ access_token: DUMMY_JWT, user: MOCK_USER }) }));

    // Mock Profile
    await page.route('**/rest/v1/profiles*', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ id: MOCK_USER.id, username: "testuser" }) }));

    // Init Auth
    await page.addInitScript(({ token, user }) => {
        window.localStorage.setItem('sb-1234-auth-token', JSON.stringify({
            access_token: token,
            refresh_token: "fake-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: user
        }));
        // Just to be safe, set the specific one too since it's hardcoded in some tests
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: token,
            refresh_token: "fake-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: user
        }));
    }, { token: DUMMY_JWT, user: MOCK_USER });
  });

  test('SidebarInset renders correctly and max-w-5xl centers content without horizontal overflow', async ({ page }) => {
    // Set a wide desktop viewport to test max-w centering
    await page.setViewportSize({ width: 1440, height: 900 });

    // Use preview server
    await page.goto('http://localhost:4173/');

    // Wait for the main layout to mount
    const mainLayout = page.locator('[data-testid="main-layout"]');
    await expect(mainLayout).toBeVisible();

    // Verify Sidebar exists
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Check main content wrapper in AppLayout has max-w-5xl and mx-auto
    const contentWrapper = mainLayout.locator('.max-w-5xl.mx-auto').first();
    await expect(contentWrapper).toBeVisible();

    // Verify horizontal overflow on the whole page
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    // Since we're using inset layout, scroll width should not exceed client width
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Expand sidebar and re-check overflow
    // Find the sidebar root to check/trigger state
    const sidebarRoot = page.locator('.group.peer[data-state]').first();

    // We hover the sidebar to expand it since it uses "icon" collapsible mode with hover
    await sidebar.hover();

    // Wait for transition
    await page.waitForTimeout(500);

    // Re-check overflow after state change
    const scrollWidthAfter = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidthAfter).toBeLessThanOrEqual(clientWidth);

    // Check centering: wrapper should be centered within its parent
    const parentBox = await mainLayout.boundingBox();
    const wrapperBox = await contentWrapper.boundingBox();

    expect(parentBox).not.toBeNull();
    expect(wrapperBox).not.toBeNull();

    if (parentBox && wrapperBox) {
      // Allow for some pixel rounding differences, usually margin auto splits space equally
      const leftSpace = wrapperBox.x - parentBox.x;
      const rightSpace = (parentBox.x + parentBox.width) - (wrapperBox.x + wrapperBox.width);

      // The spaces should be roughly equal if it's properly centered
      expect(Math.abs(leftSpace - rightSpace)).toBeLessThan(5);

      // max-w-5xl is 64rem = 1024px. The wrapper shouldn't be wider than this.
      expect(wrapperBox.width).toBeLessThanOrEqual(1024);
    }
  });

  test('Routing logic and outlet rendering remain intact', async ({ page }) => {
    // Set desktop viewport so the sidebar layout is active
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('http://localhost:4173/');

    const mainLayout = page.locator('[data-testid="main-layout"]');
    await expect(mainLayout).toBeVisible();

    // Navigation should work within the inset
    // Wait for network idle or feed to appear
    await page.waitForTimeout(1000);

    // Navigate to Search page via sidebar. Look specifically in the sidebar.
    const searchLink = page.locator('[data-sidebar="sidebar"] a[href="/search"]');
    await searchLink.click();

    // Verify it navigated correctly
    await expect(page).toHaveURL(/.*\/search/);

    // We can just verify the main layout is still there after navigation
    await expect(mainLayout).toBeVisible();

    // Search page may not use max-w-5xl mx-auto (e.g., if it uses fullWidth or variant="map").
    // Simply asserting that the mainLayout exists and we are at the /search URL is enough
    // to prove the layout outlet works and wasn't destroyed during navigation.
  });
});
