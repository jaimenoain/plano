import { test, expect } from '@playwright/test';

test('verify add building to session does not default to main feature', async ({ page }) => {
  const groupSlug = 'test-group';
  const groupId = '00000000-0000-0000-0000-000000000001';
  const buildingId = '11111111-1111-1111-1111-111111111111';

  // Mock User Session
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
            role: "authenticated"
        }
    }));
  });

  // Mock Auth User
  await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: "user-uuid",
              email: "test@example.com",
              role: "authenticated",
              aud: "authenticated"
          })
      });
  });

  // Mock Group Resolution
  await page.route('**/rest/v1/groups*', async route => {
    console.log('Intercepted groups request:', route.request().url());
    if (route.request().url().includes(`slug=eq.${groupSlug}`)) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: groupId,
                slug: groupSlug,
                private: [{ home_base: 'physical:London' }]
            })
        });
    } else {
        await route.continue();
    }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Mock Cycles
  await page.route('**/rest/v1/group_cycles?*', async route => {
    await route.fulfill({ status: 200, json: [] });
  });

  // Mock Polls
  await page.route('**/rest/v1/polls?*', async route => {
    await route.fulfill({ status: 200, json: [] });
  });

  // Mock Search Buildings
  await page.route('**/rest/v1/buildings?select=*&name=ilike.*&limit=10', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: buildingId,
        name: 'Test Building',
        address: '123 Test St',
        main_image_url: null
      }])
    });
  });

  await page.goto(`http://localhost:8080/groups/${groupSlug}/session/create`);

  // Wait for page to load
  await expect(page.getByRole('button', { name: 'Add Building' })).toBeVisible({ timeout: 10000 });

  // Open "Add Building" section (it might be closed by default)
  // Check if "Buildings / Sites" is visible, if not click "Add Building"
  const addBuildingBtn = page.getByRole('button', { name: 'Add Building' });
  if (await addBuildingBtn.isVisible()) {
      await addBuildingBtn.click();
  }

  // Search for building
  const searchInput = page.getByPlaceholder('Search to add...');
  await searchInput.fill('Test');

  // Wait for results
  await expect(page.getByText('Test Building')).toBeVisible();

  // Click on the result to add it
  await page.getByText('Test Building').click();

  // Verify the building is added to the list
  await expect(page.locator('h3', { hasText: 'Test Building' })).toBeVisible();

  // Verify it is NOT main feature
  // The button has title "Set as Main Feature".
  // If it is main, it has class `text-yellow-500`.
  // If not main, it has class `text-muted-foreground`.

  const crownBtn = page.locator('button[title="Set as Main Feature"]');
  await expect(crownBtn).toBeVisible();

  // Assert it does NOT have yellow text class (checking class string loosely)
  // Or check computed style. Playwright's toHaveClass matches full class string or regex.
  // The class string when NOT main: "h-8 w-8 transition-colors text-muted-foreground hover:text-yellow-500"
  // The class string when IS main: "h-8 w-8 transition-colors text-yellow-500 hover:text-yellow-600 ..."

  // It has text-muted-foreground when inactive.
  await expect(crownBtn).toHaveClass(/text-muted-foreground/);

  // Check SVG inside for fill-current (active state)
  await expect(crownBtn.locator('svg')).not.toHaveClass(/fill-current/);

  // The container should not have the ring
  const container = page.locator('div.relative.flex.gap-4.p-4');
  await expect(container).not.toHaveClass(/ring-yellow-500/);

  await page.screenshot({ path: 'verification_success.png', fullPage: true });
});
