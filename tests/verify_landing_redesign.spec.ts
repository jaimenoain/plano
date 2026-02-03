import { test, expect } from '@playwright/test';

test('verify landing page redesign (Swiss Editorial)', async ({ page }) => {
  // 1. Mock Unauthenticated User
  // We ensure no auth token is in localStorage and the auth endpoint returns 401/null
  // to force the Landing component to render.

  // Clear any existing auth token
  await page.addInitScript(() => {
    window.localStorage.removeItem('sb-lnqxtomyucnnrgeapnzt-auth-token');
  });

  // Mock Auth User endpoint to return null (unauthenticated)
  await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: "unauthorized" })
      });
  });

  // Mock user groups summary to avoid errors if it tries to fetch (though it shouldn't for landing)
  await page.route('**/rest/v1/rpc/get_user_groups_summary', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });

  // 2. Navigate to Root
  await page.goto('http://localhost:8080/');

  // Wait for the main landing content to appear
  await expect(page.locator('main')).toBeVisible();

  // 3. Hero Structure Verification
  const heroHeading = page.getByRole('heading', { name: "The world's architecture, cataloged." });
  await expect(heroHeading).toBeVisible();

  // Verify Hero Background
  // We look for the container with the specific gradient class.
  // The class contains special characters so we use a partial match or specific selector strategy if needed.
  // Here we check if any div has this class.
  const heroContainer = page.locator('div.bg-\\[radial-gradient\\(\\#e5e7eb_1px\\,transparent_1px\\)\\]');
  await expect(heroContainer).toBeVisible();

  // Ensure it does not have an inline background-image style (old style check)
  const styleAttribute = await heroContainer.getAttribute('style');
  if (styleAttribute) {
      expect(styleAttribute).not.toContain('background-image: url');
  }

  // 4. Search Input Verification
  const searchInput = page.getByPlaceholder('Search for a city, building, or architect...');
  await expect(searchInput).toBeVisible();

  // Verify "Hard Edge" styling (shadow)
  // The input is inside a div with the shadow class.
  // We can find the input and check its ancestor.
  // We filter to find the specific wrapper that contains the search input to avoid matching floating cards.
  const inputWrapper = page.locator('div.shadow-\\[4px_4px_0px_0px_rgba\\(0\\,0\\,0\\,1\\)\\]').filter({ has: page.locator('input') });
  await expect(inputWrapper).toBeVisible();

  // 5. Marquee Verification
  // Check for presence of LandingMarquee content
  // Note: The marquee duplicates items for seamless scrolling, so we use .first()
  await expect(page.getByText('Alice').first()).toBeVisible();
  await expect(page.getByText('Bob').first()).toBeVisible();

  // Check for border-y class on the marquee container
  const marqueeContainer = page.locator('div.border-y');
  await expect(marqueeContainer).toBeVisible();

  // 6. Feature Grid Verification
  await expect(page.getByRole('heading', { name: 'Log Your Journey' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Curate Lists' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Follow Architects' })).toBeVisible();

  // 7. No Scroll Errors
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Wait a bit to ensure no crash/layout shift
  await page.waitForTimeout(500);

  // Verify we are still on the page and things are visible
  await expect(page.getByRole('heading', { name: 'Follow Architects' })).toBeVisible();
});
