import { test, expect } from '@playwright/test';

test('Verify Priority Rating Text (Pending Mode)', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 0. Setup Mock User Session
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake-token",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: { onboarding_completed: true }
        }
    }));
  });

  // Mock Google Maps API
  await page.addInitScript(() => {
    window.google = {
      maps: {
        Map: class {
            setCenter() {}
            setZoom() {}
            addListener() {}
        },
        Marker: class {
            setMap() {}
            setPosition() {}
        },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async () => ({}),
      }
    };
  });

  // Mock Building Data
  const buildingId = 'mock-building-id';
  const mockBuilding = {
      id: buildingId,
      name: 'Test Priority Building',
      location: 'POINT(-0.1278 51.5074)',
      address: '456 Priority Ln',
      architects: [{ id: 'arch-1', name: 'Frank Lloyd Wright' }],
      year_completed: 1935,
      styles: [{ style: { id: 'style-1', name: 'Organic' } }],
      main_image_url: 'http://example.com/img.jpg',
      description: 'A building to visit.',
      created_by: 'other-user-id'
  };

  // Mock Network Requests
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (route.request().method() === 'GET' && url.includes(`id=eq.${buildingId}`)) {
          await route.fulfill({ json: mockBuilding });
      } else {
          await route.continue();
      }
  });

  // Mock Building Architects
  await page.route('**/rest/v1/building_architects*', async route => {
      await route.fulfill({ json: [] });
  });

  // Mock User Buildings (Feed/Status)
  await page.route('**/rest/v1/user_buildings*', async route => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
          // If query for specific user status
          if (url.includes('user_id=eq.user-uuid') && url.includes(`building_id=eq.${buildingId}`)) {
              // Return null initially (not visited)
              await route.fulfill({ json: [] });
          }
          // If query for feed (entries)
          else if (url.includes(`building_id=eq.${buildingId}`)) {
              await route.fulfill({ json: [] });
          }
          else {
              await route.continue();
          }
      } else if (method === 'POST') {
           const postData = route.request().postDataJSON();
           console.log("Upsert Payload:", postData);
           await route.fulfill({ status: 201, json: postData });
      } else {
          await route.continue();
      }
  });

    // Mock Profile
  await page.route('**/rest/v1/profiles*', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ json: [{ username: 'testuser', avatar_url: null }] });
      } else {
        await route.continue();
      }
  });


  // 1. Navigate to Building Details
  await page.goto(`http://localhost:8080/building/${buildingId}`);

  // 2. Verify Initial State
  await expect(page.getByRole('heading', { name: 'Test Priority Building' })).toBeVisible();

  // 3. Click "Save" to set status to Pending
  // Initially userStatus is null, so button says "Save"
  const saveButton = page.getByRole('button', { name: 'Save' });
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  // Verify UI changes to "Pending"
  await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible();
  await expect(page.getByText('(Priority)')).toBeVisible();

  // 4. Verify Rating Text
  const stars = page.locator('button:has(svg.lucide-circle)');
  await expect(stars).toHaveCount(5);

  // Hover over 5th star
  const star5 = stars.nth(4);
  await star5.hover();

  // 5. Assert "Must go" is visible (New Requirement)
  // This should FAIL currently because it is "Must go immediately"
  await expect(page.getByText('Must go', { exact: true })).toBeVisible();

  await page.screenshot({ path: 'verification/verify_priority_rating_text.png' });
});
