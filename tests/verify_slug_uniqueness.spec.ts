import { test, expect } from '@playwright/test';

const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

test.describe('verify slug uniqueness during building creation', () => {
  test.beforeEach(async ({ page }) => {
    // 2. Mock Authenticated User
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

    // 3. Mock Network Requests
    // Mock the insert request to buildings to prevent actual DB interaction which might fail due to RLS/keys
    await page.route('**/rest/v1/buildings*', async (route, request) => {
        if (request.method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                // AddBuildingDetails uses .select().single(), so it expects a single object, not an array.
                body: JSON.stringify({ id: 'fake-building-uuid' })
            });
        } else {
            await route.fallback();
        }
    });

    // We also need to mock some other data fetching to avoid errors
    await page.route('**/rest/v1/rpc/check_slug_availability', async (route, request) => {
        // Validation schema also checks this endpoint, so we return true for validation to pass
        // But the component uses React Query which might cache or use the first response.
        // Actually, the schema checks with `target_slug` which is the modified slug.
        try {
            const body = JSON.parse(request.postData() || '{}');
            if (body.target_slug === 'collision-test-building') {
                return route.fulfill({ status: 200, contentType: 'application/json', body: 'false' });
            }
            if (body.target_slug === 'collision-test-building-1') {
                return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
            }
        } catch (e) {
            // ignore
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
    });

    await page.route('**/rest/v1/functional_categories?select=*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/rest/v1/functional_typologies?select=*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/rest/v1/attribute_groups?select=*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/rest/v1/attributes?select=*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/rest/v1/user_buildings*', async route => {
       await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('should display and submit modified slug when collision occurs', async ({ page }) => {
    // 4. Simulate User Flow
    await page.goto('/add-building?lat=51.5074&lng=-0.1278');

    // Wait for the Continue button and click it
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // If duplicate building dialog appears, click "No, I want to create a new entry"
    const duplicateDialog = page.getByRole('dialog', { name: 'Duplicate Building Found' });
    if (await duplicateDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'No, I want to create a new entry' }).click();
    }

    // Verify we are on the details form
    const saveBtn = page.getByRole('button', { name: 'Save Building' });
    await expect(saveBtn).toBeVisible();

    // Fill the Name input
    const nameInput = page.getByLabel('Name');
    await nameInput.fill('Collision Test Building');

    // 5. Assert Modified Slug UI
    // Because we mock check_slug_availability to return false, the finalSlug will be 'collision-test-building-1'
    const slugPreviewText = page.getByText('plano.com/b/collision-test-building-1');
    await expect(slugPreviewText).toBeVisible();

    // 6. Assert Final Creation Payload
    // Set up request interception for the building creation
    const buildingCreatePromise = page.waitForRequest(request =>
      request.url().includes('/rest/v1/buildings') && request.method() === 'POST'
    );

    // Mock the POST request to succeed
    await page.route('**/rest/v1/buildings', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'fake-building-uuid' })
        });
      } else {
        await route.fallback();
      }
    });

    // We need to fill in some required fields for the form to actually submit
    // Wait, let's check validation errors first. If it's timing out on waiting for request, the form might not be submitting because of validation errors.

    // Let's ensure the Year and Category are not required or fill them if they are.
    // Looking at the schema, year_completed is nullable. functional_category_id is nullable.

    // The issue might be that the saveBtn click is not triggering a submit if there's a validation error.
    // Let's add a check for toast errors.

    // Check if there are any toast errors visible before waiting to help debug
    page.on('dialog', dialog => dialog.dismiss());

    // Submit the form
    await saveBtn.click();

    // Await the captured request and parse payload
    const buildingCreateRequest = await buildingCreatePromise;
    const payload = JSON.parse(buildingCreateRequest.postData() || '{}');

    // Assert the payload slug
    // Supabase JS client usually sends the object directly in postData for inserts
    expect(payload.slug).toBe('collision-test-building-1');

    // Assert Final URL navigation
    // AddBuildingDetails navigates to /building/${insertedData.id} upon successful creation
    // When we mocked the buildings insertion we returned `[{ id: 'fake-building-uuid' }]`.
    // Let's verify that the navigation to `/building/fake-building-uuid` happens.
    // However, if the page doesn't exist, it might redirect to / or 404. Let's just wait for the URL to change.
    await page.waitForURL('**/building/fake-building-uuid**', { timeout: 10000 }).catch(() => {});
    expect(page.url()).toContain('/building/fake-building-uuid');
  });
});
