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

  // NOTE: In Inline mode, the "Rating" button is replaced by stars directly.
  // await expect(page.getByRole('button', { name: 'Rating' })).toBeVisible(); // Button Label - REMOVED

  await expect(page.getByText('(Priority)')).not.toBeVisible();

  // 3. Mark as Visited
  await visitedButton.click();

  // Verify status update triggered UI change:
  // Header should now read "Your Rating"
  await expect(page.getByText('Your Rating')).toBeVisible();

  // 4. Interaction with Rating
  // Verify Stars are visible immediately (Inline)
  // Replaced popover interaction with direct interaction
  const stars = page.locator('button:has(svg.lucide-star)');
  await expect(stars).toHaveCount(5);

  // Requirement 2: UI & Labeling Logic
  // Check for "Rating this building" text initially
  await expect(page.getByText('Rating this building')).toBeVisible();

  // Requirement 4: Design Philosophy (Visual Feedback)
  // Hover over 1st star -> "Disappointing"
  const star1 = stars.nth(0);
  await star1.hover();
  await expect(page.getByText('Disappointing')).toBeVisible();

  // Hover over 5th star -> "Masterpiece"
  const star5 = stars.nth(4);
  await star5.hover();
  await expect(page.getByText('Masterpiece')).toBeVisible();

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

  // Verify Timestamp usage (Fix for 400 Bad Request)
  expect(postData.edited_at).toBeDefined();
  expect(postData.updated_at).toBeUndefined();

  // Verify UI update after rating
  // The inline component should stay inline, but maybe show selected state.
  // In `PersonalRatingButton`, logic for "hasRated" inside `inline` variant:
  /*
      const renderStars = () => (
         ...
          {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => {
             const isFilled = (hoverRating !== null ? star <= hoverRating : (initialRating || 0) >= star);
             ...
  */
  // So the stars should update to reflect the new rating (filled).
  // The test below originally checked for a button "5/5" which was the "hasRated" state of the Popover trigger button.
  // await expect(page.getByRole('button', { name: '5/5' })).toBeVisible();

  // In inline mode, there is no button "5/5". Instead, the 5 stars should be filled.
  // We can verify that the label text changes to "Masterpiece" permanently (or at least while hovering? No, after click hover might be gone).
  // If we move mouse away, hoverRating becomes null, so it falls back to initialRating.
  // `getRatingLabel(initialRating)` for 5 is "Masterpiece".
  // So we expect "Masterpiece" to be visible even without hover.

  // Move mouse away to clear hover
  await page.mouse.move(0, 0);
  await expect(page.getByText('Masterpiece')).toBeVisible();

});
