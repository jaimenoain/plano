import { test, expect } from '@playwright/test';

test.describe('Filter Drawer - Curator & Friend Filters', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock Taxonomy Data (reused from verify_filter_drawer)
    await page.route('**/rest/v1/functional_categories*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-commercial', name: 'Commercial', slug: 'commercial' }
        ]),
      });
    });

    await page.route('**/rest/v1/functional_typologies*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'typ-office', name: 'Office', parent_category_id: 'cat-commercial', slug: 'office' }
        ]),
      });
    });

    await page.route('**/rest/v1/attribute_groups*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'grp-style', name: 'Style', slug: 'style' },
          { id: 'grp-context', name: 'Context', slug: 'context' },
          { id: 'grp-materiality', name: 'Materiality', slug: 'materiality' }
        ]),
      });
    });

    await page.route('**/rest/v1/attributes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'attr-brutalist', name: 'Brutalist', group_id: 'grp-style', slug: 'brutalist' },
          { id: 'attr-urban', name: 'Urban', group_id: 'grp-context', slug: 'urban' },
          { id: 'attr-concrete', name: 'Concrete', group_id: 'grp-materiality', slug: 'concrete' }
        ]),
      });
    });

    // Mock User Search (Profiles)
    await page.route('**/rest/v1/profiles*', async (route) => {
      const url = route.request().url();

      // Mock search query "alice"
      // Supabase sends encoded like: username=ilike.%25alice%25
      if (url.includes('alice')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'user-alice', username: 'alice', avatar_url: null }
          ]),
        });
        return;
      }

      // Mock hydration query for "bob"
      if (url.includes('bob')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: 'user-bob', username: 'bob', avatar_url: null }
            ]),
          });
          return;
      }

      // Default empty
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
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
  });

  test('New Feature: Selecting a curator enables Curator Status filter', async ({ page }) => {
    await page.goto('/search?mode=discover');

    // Open Filter Drawer
    const filtersButton = page.getByRole('button', { name: 'Filters' });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();

    // Verify "Curator Status" is hidden initially (in Discover mode)
    // Note: The text is "Curator Status" in contact mode, "Status" in library mode.
    // In Discover mode without contact, it should be hidden.
    const statusLabel = page.getByText('Curator Status');
    await expect(statusLabel).toBeHidden();
    const statusLabelPlain = page.getByText('Status', { exact: true });
    await expect(statusLabelPlain).toBeHidden();

    // Expand "Curators & Friends"
    const curatorAccordion = page.getByRole('button', { name: 'Curators & Friends' });
    await curatorAccordion.click();

    // Search for "alice"
    const contactInput = page.getByPlaceholder('Search people...');
    await contactInput.fill('alice');
    await contactInput.click(); // Focus to trigger suggest

    // Select "alice" from results
    // Wait for the suggestion to appear (mocked response)
    // Using getByText to be safer with cmdk structure
    const aliceOption = page.getByRole('option').filter({ hasText: 'alice' }).first();
    await expect(aliceOption).toBeVisible();
    await aliceOption.click();

    // Verify URL update first (debugging step)
    // rated_by should be set to 'alice'
    await expect(page).toHaveURL(/rated_by=alice/);

    // Verify "Curator Status" is now visible
    await expect(statusLabel).toBeVisible();

    // Verify "Saved" and "Visited" are selected by default
    const savedToggle = page.getByRole('button', { name: 'Toggle saved' });
    const visitedToggle = page.getByRole('button', { name: 'Toggle visited' });

    await expect(savedToggle).toHaveAttribute('data-state', 'on');
    await expect(visitedToggle).toHaveAttribute('data-state', 'on');

    // Toggle "Saved" off
    await savedToggle.click();
    await expect(savedToggle).toHaveAttribute('data-state', 'off');

    // Verify URL/State update
    // We check that the filter state reflects the change.
    // The URL 'filters' param is JSON encoded.
    const url = new URL(page.url());
    const filtersParam = url.searchParams.get('filters');
    expect(filtersParam).toBeTruthy();
    const filters = JSON.parse(filtersParam!);
    // Status should now be only ['visited']
    expect(filters.status).toEqual(['visited']);
  });

  test('Regression: Status filter visibility across modes', async ({ page }) => {
    // 1. Discover Mode Default
    await page.goto('/search?mode=discover');
    await page.getByRole('button', { name: 'Filters' }).click();

    // Status should be hidden
    await expect(page.getByText('Curator Status')).toBeHidden();
    await expect(page.getByText('Status', { exact: true })).toBeHidden();

    // 2. Library Mode
    // Close drawer or reload to switch mode cleanly (or use the toggle in drawer)
    // Let's use the toggle in drawer
    const libraryModeToggle = page.getByRole('button', { name: 'My Library' }); // Segmented control
    await libraryModeToggle.click();

    // Status should be visible (as "Status")
    await expect(page.getByText('Status', { exact: true })).toBeVisible();

    // 3. Clear All
    // Add some filters first or just click Clear All
    // The drawer is open.
    // Switch back to Discover? Or just check Clear All behavior.
    // Let's switch back to Discover to test "Clear All hides Status".
    const discoverModeToggle = page.getByRole('button', { name: 'Discover' });
    await discoverModeToggle.click();

    // Add a curator to make status visible
    const curatorAccordion = page.getByRole('button', { name: 'Curators & Friends' });
    await curatorAccordion.click();
    const contactInput = page.getByPlaceholder('Search people...');
    await contactInput.fill('alice');
    const aliceOption = page.getByRole('option').filter({ hasText: 'alice' }).first();
    await aliceOption.click();

    await expect(page.getByText('Curator Status')).toBeVisible();

    // Click "Clear all"
    const clearAllButton = page.getByRole('button', { name: 'Clear all' });
    await clearAllButton.click();

    // Expect "Curator Status" to hide
    await expect(page.getByText('Curator Status')).toBeHidden();
    // And contact to be removed
    // We can check if the badge is gone or input is empty
    const aliceBadge = page.locator('.badge', { hasText: 'alice' }); // Adjust selector if needed
    await expect(aliceBadge).toBeHidden();
  });

  test('URL Hydration: Loading with rated_by param pre-fills curator', async ({ page }) => {
    // Navigate with rated_by=bob
    await page.goto('/search?mode=discover&rated_by=bob');

    // Open Filter Drawer
    const filtersButton = page.getByRole('button', { name: 'Filters' });
    await filtersButton.click();

    // Expand "Curators & Friends"
    const curatorAccordion = page.getByRole('button', { name: 'Curators & Friends' });
    await curatorAccordion.click();

    // Expect "bob" to be selected
    // Check for the badge in the contact picker
    // The ContactPicker renders selected contacts as badges
    // Using loose match because badge contains other elements
    const bobBadge = page.locator('.badge, [role="status"], div').filter({ hasText: 'bob' }).first();
    await expect(bobBadge).toBeVisible();

    // Expect "Curator Status" to be visible
    await expect(page.getByText('Curator Status')).toBeVisible();
  });
});
