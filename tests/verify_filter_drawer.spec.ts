import { test, expect } from '@playwright/test';

test.describe('Filter Drawer & Taxonomy', () => {
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

    // Mock Taxonomy Data
    // Functional Categories
    await page.route('**/rest/v1/functional_categories*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-commercial', name: 'Commercial', slug: 'commercial' }
        ]),
      });
    });

    // Functional Typologies
    await page.route('**/rest/v1/functional_typologies*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'typ-office', name: 'Office', parent_category_id: 'cat-commercial', slug: 'office' }
        ]),
      });
    });

    // Attribute Groups
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

    // Attributes
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

  test('Structure: Filter Drawer displays Style and Context sections', async ({ page }) => {
    await page.goto('/search');

    // Open Filter Drawer
    const filtersButton = page.getByRole('button', { name: 'Filters' });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();

    // Verify Drawer Content
    const drawer = page.getByRole('dialog', { name: 'Filters' });
    await expect(drawer).toBeVisible();

    // Verify Accordion Items
    const styleAccordion = drawer.getByRole('button', { name: 'Style' });
    const contextAccordion = drawer.getByRole('button', { name: 'Context' });
    await expect(styleAccordion).toBeVisible();
    await expect(contextAccordion).toBeVisible();

    // Expand Style and Verify Content
    await styleAccordion.click();
    const brutalistCheckbox = drawer.getByLabel('Brutalist');
    await expect(brutalistCheckbox).toBeVisible();

    // Expand Context and Verify Content
    await contextAccordion.click();
    const urbanCheckbox = drawer.getByLabel('Urban');
    await expect(urbanCheckbox).toBeVisible();
  });

  test('URL State: Selecting a Style updates the URL', async ({ page }) => {
    await page.goto('/search');

    // Open Filter Drawer
    await page.getByRole('button', { name: 'Filters' }).click();

    // Expand Style
    await page.getByRole('button', { name: 'Style' }).click();

    // Click "Brutalist"
    await page.getByLabel('Brutalist').click();

    // Verify URL
    await expect(page).toHaveURL(/filters=/);
    const url = new URL(page.url());
    const filtersParam = url.searchParams.get('filters');
    expect(filtersParam).toBeTruthy();

    const filters = JSON.parse(filtersParam!);
    expect(filters.styles).toContain('attr-brutalist');
  });

  test('Clear All: Removes filters from URL', async ({ page }) => {
    // Navigate with existing filters
    const initialFilters = { minRating: 2 };
    const encodedFilters = encodeURIComponent(JSON.stringify(initialFilters));
    await page.goto(`/search?filters=${encodedFilters}`);

    // Verify initial state (URL has filters)
    await expect(page).toHaveURL(/minRating/);

    // Open Filter Drawer
    const filtersButton = page.getByRole('button', { name: 'Filters' });
    await filtersButton.click();

    // Click "Clear all"
    const clearAllButton = page.getByRole('button', { name: 'Clear all' });
    await expect(clearAllButton).toBeVisible();
    await clearAllButton.click();

    // Verify URL (filters param should be gone or empty object)
    // The implementation might remove the param entirely or set it to empty
    // Let's check that minRating is gone.
    const url = new URL(page.url());
    const filtersParam = url.searchParams.get('filters');

    if (filtersParam) {
        const filters = JSON.parse(filtersParam);
        expect(filters.minRating).toBeUndefined();
    } else {
        expect(filtersParam).toBeNull();
    }
  });
});
