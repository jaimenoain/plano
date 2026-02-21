import { test, expect } from '@playwright/test';

const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

test('Itinerary Generation Flow', async ({ page }) => {
  // 1. Mock Session
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

  // 2. Mock Data
  const MOCK_COLLECTION = {
      id: 'col-123',
      name: 'My Trip',
      description: 'A test trip',
      owner_id: 'user-uuid',
      itinerary: null
  };

  const MOCK_ITEMS = [
      {
          id: 'item-1',
          collection_id: 'col-123',
          building_id: 'b1',
          building: {
              id: 'b1',
              name: 'Building 1',
              location_lat: 40.7128,
              location_lng: -74.0060,
              hero_image_url: null,
              location_precision: 'exact'
          }
      },
      {
          id: 'item-2',
          collection_id: 'col-123',
          building_id: 'b2',
          building: {
              id: 'b2',
              name: 'Building 2',
              location_lat: 40.7138,
              location_lng: -74.0070,
              hero_image_url: null,
              location_precision: 'exact'
          }
      }
  ];

  const MOCK_ITINERARY_RESPONSE = {
      message: 'Itinerary generated successfully',
      itinerary: {
          days: 3,
          transportMode: 'walking',
          routes: [
              {
                  dayNumber: 1,
                  buildingIds: ['b1', 'b2'],
                  routeGeometry: { type: 'LineString', coordinates: [[-74.0060, 40.7128], [-74.0070, 40.7138]] },
                  isFallback: false
              },
              {
                  dayNumber: 2,
                  buildingIds: [],
                  routeGeometry: null,
                  isFallback: false
              },
              {
                  dayNumber: 3,
                  buildingIds: [],
                  routeGeometry: null,
                  isFallback: false
              }
          ]
      }
  };

  // 3. Setup Routes
  // Mock collection fetch
  await page.route('**/rest/v1/collections*', async (route) => {
      // If it's a specific ID query, return the single object or array depending on implementation
      // Supabase .single() usually expects object, but .select() returns array.
      // Assuming frontend uses .single() for collection detail page.
      if (route.request().url().includes('single')) {
           // Not really detectable via URL param 'single' usually, but by header.
           // However, let's just return array and assume frontend handles it or we return object if it expects object.
           // Wait, usually REST API returns array unless header Prefer: return=representation.
           // Let's inspect how the app fetches it.
           // But for now, returning array [MOCK_COLLECTION] is safest for list, and checking if single logic handles array.
           // Actually, if using .single(), supabase client expects object.
           // Let's assume array for now.
           await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([MOCK_COLLECTION])
          });
      } else {
           await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([MOCK_COLLECTION])
          });
      }
  });

  await page.route('**/rest/v1/collection_items*', async (route) => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ITEMS)
      });
  });

  // Mock generate-itinerary function
  await page.route('**/functions/v1/generate-itinerary', async (route) => {
      // Verify payload
      const postData = route.request().postDataJSON();
      // We can assert here, but failing inside route handler might timeout the test weirdly.
      // Better to capture and assert later, or just logging.
      console.log('Intercepted generate-itinerary request', postData);

      // Simulate network delay for loading state check
      await new Promise(resolve => setTimeout(resolve, 1000));

      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ITINERARY_RESPONSE)
      });
  });

  // 4. Navigate
  await page.goto('http://localhost:8080/collection/col-123');

  // 5. Verify CTA and Interact
  // Look for "Planificar Ruta" or "Plan Route" button.
  // The dialog title is "Plan Route".
  // The button to open it usually says "Plan Route" or similar.
  const planButton = page.getByRole('button', { name: /Plan Route|Planificar Ruta/i });
  await expect(planButton).toBeVisible();
  await planButton.click();

  // 6. Fill Form
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Plan Route')).toBeVisible();

  // Enter days
  const daysInput = page.locator('input[type="number"]');
  await daysInput.fill('3');

  // Select Transport Mode
  // SegmentedControl usually renders buttons with labels.
  const walkingOption = page.getByText('Walking', { exact: true });
  await walkingOption.click();

  // Submit
  const submitButton = page.getByRole('button', { name: 'Generate Itinerary' });
  await submitButton.click();

  // 7. Verify Loading State
  // We expect ItineraryGenerationOverlay to appear.
  // It probably has a loader or text.
  // We can look for "Generating..." which is in the button when loading,
  // OR the overlay if it covers screen.
  // The code says <ItineraryGenerationOverlay open={isLoading} />
  // And button text changes to "Generating..."
  await expect(page.getByText('Generating...')).toBeVisible();

  // 8. Verify Itinerary View
  // After mock response, the view should update.
  // We expect "Day 1", "Day 2", "Day 3" to appear in tabs or headers.
  await expect(page.getByText('Day 1')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Day 2')).toBeVisible();
  await expect(page.getByText('Day 3')).toBeVisible();

});
