import { test, expect } from '@playwright/test';

test('Verify Dual-Context Scoring System (Quality Mode)', async ({ page }) => {
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
            role: "authenticated"
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
      name: 'Test Architecture Building',
      location: 'POINT(-0.1278 51.5074)',
      address: '123 Test St',
      architects: ['Zaha Hadid'],
      year_completed: 2020,
      styles: ['Futurism'],
      main_image_url: 'http://example.com/img.jpg',
      description: 'A test building.',
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
          // Upsert handling (POST to /user_buildings with On Conflict)
           const postData = route.request().postDataJSON();
           console.log("Upsert Payload:", postData);

           await route.fulfill({ status: 201, json: postData });
      } else {
          await route.continue();
      }
  });

  // 1. Navigate to Building Details
  await page.goto(`http://localhost:8080/building/${buildingId}`);

  // 2. Verify Initial State
  await expect(page.getByRole('heading', { name: 'Test Architecture Building' })).toBeVisible();

  // Requirement 1: Verify Trigger Condition (Mark as Visited)
  const visitedButton = page.getByRole('button', { name: 'Visited' });
  await expect(visitedButton).toBeVisible();

  // Initial Label Check: Should allow "Rate" or "Priority" depending on status.
  // Since no status, default might be "Visited" context in component but we haven't clicked visited yet.
  // Wait, component logic: `status = userStatus || 'visited'`. `userStatus` is null initially.
  // So it defaults to 'visited'.
  // Label prop: `label={userStatus === 'pending' ? "Priority" : "Rating"}`.
  // So initially label should be "Rating".

  // Header logic: {userStatus === 'visited' ? 'Your Rating' : 'Your Interest'}
  // Initially userStatus is null, so it shows 'Your Interest'.
  await expect(page.getByText('Your Interest')).toBeVisible(); // Header
  await expect(page.getByRole('button', { name: 'Rating' })).toBeVisible(); // Button Label
  await expect(page.getByText('(Priority)')).not.toBeVisible();

  // 3. Mark as Visited
  await visitedButton.click();

  // Verify status update triggered UI change:
  // Header should now read "Your Rating"
  await expect(page.getByText('Your Rating')).toBeVisible();

  // 4. Interaction with Rating
  // Click the rating button to open popover
  await page.getByRole('button', { name: 'Rating' }).click();

  const popover = page.locator('[data-radix-popper-content-wrapper]');
  await expect(popover).toBeVisible();

  // Requirement 2: UI & Labeling Logic
  // Check for "Rating this building" text initially
  await expect(popover.getByText('Rating this building')).toBeVisible();

  // Requirement 3: Data Integrity & Constraints (1-5)
  // Verify 5 stars exist
  const stars = popover.locator('button > svg.lucide-star');
  await expect(stars).toHaveCount(5);

  // Requirement 4: Design Philosophy (Visual Feedback)
  // Hover over 1st star -> "Disappointing"
  const star1 = stars.nth(0);
  await star1.hover();
  await expect(popover.getByText('Disappointing')).toBeVisible();

  // Hover over 5th star -> "Masterpiece"
  const star5 = stars.nth(4);
  await star5.hover();
  await expect(popover.getByText('Masterpiece')).toBeVisible();

  // Click 5th star (Rate 5)
  // We need to capture the request
  const requestPromise = page.waitForRequest(req =>
      req.url().includes('user_buildings') && req.method() === 'POST'
  );

  await star5.click();

  const request = await requestPromise;
  const postData = request.postDataJSON();

  // Verify Payload
  // Expected: rating: 5, status: 'visited' (since we clicked visited earlier)
  expect(postData.rating).toBe(5);
  expect(postData.status).toBe('visited');
  expect(postData.building_id).toBe(buildingId);
  expect(postData.user_id).toBe('user-uuid');

  // Verify UI update after rating
  // The button should now show "5/5"
  await expect(page.getByRole('button', { name: '5/5' })).toBeVisible();

});
