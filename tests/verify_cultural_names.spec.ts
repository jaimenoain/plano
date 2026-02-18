import { test, expect } from '@playwright/test';

// Credentials from TEST_USERS.md
const TEST_USER = {
  email: "tester@cineforum.eu",
  password: "CnjFsiVD2YgX9iBuZrfj"
};

const supabaseUrl = 'https://lnqxtomyucnnrgeapnzt.supabase.co';

test('verify cultural names: add building and search', async ({ page }) => {
  // 1. Login
  await page.goto('/auth');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to home or dashboard
  // Use regex to match the root path strictly or loosely
  await expect(page).toHaveURL(/.*localhost:8080\/$/, { timeout: 15000 });

  // 2. Mock RPC calls for Search Verification
  // We mock this AFTER login to verify the app's behavior with an authenticated user
  // This mocks the Supabase RPC call that the BuildingSidebar component makes
  await page.route(`${supabaseUrl}/rest/v1/rpc/get_buildings_list`, async route => {
    const postData = route.request().postDataJSON();

    // Check if query is "Swiss Re"
    if (postData && postData.filter_criteria && postData.filter_criteria.query === 'Swiss Re') {
       await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify([{
           id: "mock-id-123",
           name: "30 St Mary Axe",
           slug: "30-st-mary-axe",
           image_url: null,
           lat: 51.5145,
           lng: -0.0803,
           rating: 0,
           status: null,
           architects: [],
           year_completed: 2003,
           city: "London",
           country: "United Kingdom",
           popularity_score: 100,
           tier_rank: "Top 1%",
           alt_name: "The Gherkin" // Cultural Anchor feature: This is what we are verifying displays correctly
         }])
       });
    } else {
       // Return empty list for other queries (or initial load)
       // This prevents real buildings from cluttering the test view if the DB has data
       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });

  // 3. Verify Search Display
  await page.goto('/search');
  await page.waitForLoadState('networkidle');

  // Wait for sidebar to be visible (Desktop layout)
  // Or toggle list view on mobile if needed (though /search usually defaults to list/sidebar visible on mobile if implemented that way, or we toggle)
  if (await page.locator('button[aria-label="Show list view"]').isVisible()) {
      await page.locator('button[aria-label="Show list view"]').click();
  }

  // Find the visible search input.
  const searchInput = page.getByPlaceholder('Search', { exact: false }).last();
  await searchInput.fill('Swiss Re');

  // Wait for results
  // We expect the building card to appear based on our mocked response
  const card = page.locator('.group', { hasText: '30 St Mary Axe' }).first();
  await expect(card).toBeVisible();

  // Assert subtitle "The Gherkin" is visible in the card
  // This verifies that BuildingSidebar.tsx is correctly rendering the `alt_name` property
  await expect(card).toContainText('The Gherkin');
});
