import { test, expect } from '@playwright/test';

test('Verify Edit Building Architects', async ({ page }) => {
  test.setTimeout(60000);

  // 0. Setup Mock User Session
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "header.payload.signature", // Fake 3-part JWT
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

  // Mock Data
  const buildingId = 'building-uuid-1';
  const oldArchitectId = 'architect-uuid-1';
  const newArchitectId = 'architect-uuid-2';
  const categoryId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const typologyId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));
  page.on('response', response => {
    if (response.status() === 401) {
      console.log(`401 ERROR: ${response.url()}`);
    }
  });

  // Catch-all for unmocked requests to prevent 401s
  await page.route('**/rest/v1/**', async route => {
     // Check if this request was already handled by other routes
     // Playwright routes are LIFO (Last In First Out)
     // So if I define this first, it will be overridden by later definitions.
     // Wait, "When multiple routes match... the handler defined LAST is called."
     // So I should define this FIRST.
     console.log(`Fallback mock hit: ${route.request().url()}`);
     await route.fulfill({ status: 200, json: [] });
  });

  // Mock GET Building
  await page.route(/rest\/v1\/buildings.*id=eq\./, async route => {
      if (route.request().method() === 'GET') {
        console.log("Mocking GET Building");
        await route.fulfill({
            status: 200,
            json: {
                id: buildingId,
                name: 'Test Building',
                created_by: 'user-uuid',
                location: 'POINT(0 0)',
                address: 'Test Address',
                city: 'Test City',
                country: 'Test Country',
                year_completed: 2000,
                main_image_url: null,
                functional_category_id: categoryId
            }
        });
      } else {
        await route.continue();
      }
  });

  // Mock Insert Building Architects
  let insertPayload: any = null;
  // Mock Delete Building Architects
  let deleteCalled = false;

  // Mock Building Architects (GET, POST, DELETE)
  await page.route(/rest\/v1\/building_architects/, async route => {
      const method = route.request().method();
      if (method === 'GET') {
        console.log("Mocking GET Building Architects");
        await route.fulfill({
            status: 200,
            json: [
                { architect: { id: oldArchitectId, name: 'Old Architect', type: 'individual' } }
            ]
        });
      } else if (method === 'POST') {
          insertPayload = route.request().postDataJSON();
          console.log('INSERT Building Architects payload:', insertPayload);
          await route.fulfill({ status: 201 });
      } else if (method === 'DELETE') {
          console.log('DELETE Building Architects called');
          deleteCalled = true;
          await route.fulfill({ status: 204 });
      } else {
          await route.continue();
      }
  });

  // Mock other relations (empty for simplicity)
  await page.route(/rest\/v1\/building_styles.*building_id=eq\./, async route => {
      await route.fulfill({ status: 200, json: [] });
  });
  await page.route(/rest\/v1\/building_functional_typologies.*building_id=eq\./, async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [{ typology_id: typologyId }] });
      } else {
        await route.continue();
      }
  });
  await page.route(/rest\/v1\/building_attributes.*building_id=eq\./, async route => {
      await route.fulfill({ status: 200, json: [] });
  });

  // Mock RPCs
  await page.route('**/rest/v1/rpc/find_nearby_buildings', async route => {
     await route.fulfill({ status: 200, json: [] });
  });

  // Mock Taxonomy - Use start anchors or more specific patterns
  await page.route(/\/rest\/v1\/functional_categories/, async route => route.fulfill({ json: [{ id: categoryId, name: 'Residential' }] }));
  await page.route(/\/rest\/v1\/functional_typologies\?/, async route => route.fulfill({ json: [{ id: typologyId, name: 'House', parent_category_id: categoryId }] }));
  await page.route(/\/rest\/v1\/attribute_groups/, async route => route.fulfill({ json: [] }));
  await page.route(/\/rest\/v1\/attributes/, async route => route.fulfill({ json: [] }));

  // Mock Architect Search (for adding new one)
  await page.route(/rest\/v1\/architects.*name=ilike\..*/, async route => {
      await route.fulfill({
          status: 200,
          json: [
              { id: newArchitectId, name: 'New Architect', type: 'individual' }
          ]
      });
  });

  // Mock Update Building
  await page.route(`**/rest/v1/buildings?id=eq.${buildingId}`, async route => {
      if (route.request().method() === 'PATCH') {
          console.log('PATCH Building payload:', route.request().postDataJSON());
          await route.fulfill({ status: 200 });
      } else {
          await route.continue();
      }
  });

  // Mock Delete Building Architects (Removed, merged above)

  // Mock Insert Building Architects (Removed, merged above)

  // Mock Google Maps API
  await page.addInitScript(() => {
    window.google = {
      maps: {
        places: { AutocompleteService: class {}, PlacesService: class {} },
        Geocoder: class { geocode(req, cb) { cb([], "ZERO_RESULTS"); } },
        Map: class { addListener() {} setCenter() {} setZoom() {} },
        Marker: class { setMap() {} setPosition() {} },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async () => ({}),
      }
    };
  });

  // Navigate to Edit Page
  await page.goto(`http://localhost:8080/building/${buildingId}/edit`);

  // Wait for form to load
  await expect(page.getByLabel('Name *')).toHaveValue('Test Building');

  // Check if Old Architect is present
  await expect(page.getByText('Old Architect')).toBeVisible();

  // Remove Old Architect
  console.log("Attempting to remove Old Architect...");

  const removeButton = page.locator('.bg-secondary').filter({ hasText: 'Old Architect' }).locator('button');
  await expect(removeButton).toBeVisible();
  await removeButton.click();
  await expect(page.getByText('Old Architect')).not.toBeVisible();

  // Add New Architect
  const input = page.getByPlaceholder('Search architects or add new...');
  await input.fill('New Architect');
  // Wait for suggestions
  await expect(page.getByText('New Architect').last()).toBeVisible();
  await page.getByText('New Architect').last().click();

  // Verify New Architect is selected
  await expect(page.locator('.bg-secondary').filter({ hasText: 'New Architect' })).toBeVisible();

  // Submit
  const submitButton = page.getByRole('button', { name: 'Update Building' });
  await expect(submitButton).toBeEnabled();
  console.log("Clicking submit...");
  await submitButton.click();

  // Check for validation errors
  await page.waitForTimeout(1000);
  const errorMessages = await page.locator('.text-destructive, [role="alert"]').allTextContents();
  if (errorMessages.length > 0) {
      console.log("Validation Errors:", errorMessages);
  }

  // Wait for navigation or toast
  await expect(page.getByText('Building updated successfully')).toBeVisible();

  // Verify Requests
  expect(deleteCalled).toBe(true);
  expect(insertPayload).toBeTruthy();
  expect(insertPayload).toHaveLength(1);
  expect(insertPayload[0]).toEqual({ building_id: buildingId, architect_id: newArchitectId });

});
