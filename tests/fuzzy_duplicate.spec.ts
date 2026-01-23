
import { test, expect } from '@playwright/test';

const mockUser = {
  id: "test-user-id",
  email: "tester@archiforum.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString()
};

test.describe('Fuzzy Duplicate Prevention', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Mock Auth
    await page.addInitScript(user => {
      window.localStorage.setItem('sb-gyxspsuctbrxhwiyfvlj-auth-token', JSON.stringify({
        access_token: "fake-token",
        refresh_token: "fake-refresh-token",
        user: user,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }));
    }, mockUser);

    // 2. Mock User Buildings (Avoid DB error on legacy backend)
    await page.route('**/rest/v1/user_buildings*', async route => {
      await route.fulfill({ json: [] });
    });

    // 3. Mock Google Maps API (Geocoding)
    // The app loads GMaps script. We can intercept it or mock the window object.
    // However, AddBuilding.tsx uses `use-places-autocomplete`.
    // We can try to rely on the fact that if we provide lat/lng in URL, it sets the marker.
    // But `getGeocode` is called in `useEffect` to reverse geocode.
    // If that fails, it logs error but continues.

    // We'll mock the RPC for Duplicate Check.
    await page.route('**/rest/v1/rpc/find_nearby_buildings', async route => {
        const postData = route.request().postDataJSON();
        console.log("RPC Call:", postData);

        // Check if this is the fuzzy check (has name_query)
        if (postData.name_query && postData.name_query.length >= 3) {
            // Simulate finding a duplicate
            if (postData.name_query.includes('Empire')) {
                 await route.fulfill({
                    json: [
                        {
                            id: "existing-building-id",
                            name: "Empire State Building",
                            address: "350 Fifth Avenue, NYC",
                            location_lat: 40.7484,
                            location_lng: -73.9857,
                            dist_meters: 500, // Not same location (500m away)
                            similarity_score: 0.9 // High similarity!
                        }
                    ]
                 });
                 return;
            }
        }

        // Default: No results (or for location check)
        await route.fulfill({ json: [] });
    });
  });

  test('detects duplicate name and shows warning dialog', async ({ page }) => {
    // Navigate to Add Building with coordinates (simulating a pin drop)
    // Lat/Lng near Empire State Building
    const lat = 40.7484;
    const lng = -73.9857;
    await page.goto(`http://localhost:8080/add-building?lat=${lat}&lng=${lng}`);

    // Wait for page load
    await expect(page.locator('h1')).toContainText('Add a Building');

    // Fill the Name Input
    // We use "Empire State" to trigger the fuzzy match against mocked "Empire State Building"
    const nameInput = page.locator('input[id="building-name"]'); // Label "Building Name (Optional)" -> id="building-name"
    await nameInput.fill('Empire State');

    // Wait for debounce (500ms) + RPC call
    // We can check if the "Checking..." state appears, but better to wait for the duplicates list or button state.

    // The component updates `duplicates` state.
    // If duplicates > 0, they appear in the sidebar under "Nearby Buildings".
    // We expect "Nearby Buildings" badge to show "1".

    const nearbyBadge = page.locator('.bg-blue-100'); // The badge in "Nearby Buildings" card title
    await expect(nearbyBadge).toContainText('1');

    // Also verify the duplicate item is visible in the list
    // We scope to the sidebar list to avoid map tooltip collision
    const sidebarList = page.locator('.space-y-6');
    await expect(sidebarList.locator('text=Empire State Building').first()).toBeVisible();
    await expect(page.locator('text=0.5km')).toBeVisible(); // 500m

    // Click "Continue"
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.click();

    // Verify Warning Dialog
    const dialogTitle = page.locator('h2:has-text("Duplicate Building Found")');
    await expect(dialogTitle).toBeVisible();

    const dialogDesc = page.locator('text=It looks like this building is already in the database');
    await expect(dialogDesc).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'duplicate_detection_proof.png' });

    // Verify we can bypass
    const bypassButton = page.locator('button:has-text("No, I want to create a new entry")');
    await bypassButton.click();

    // Verify we moved to Step 2 (URL changes or UI changes)
    // Step 2 shows AddBuildingDetails component which we haven't inspected deeply but the URL might not change, just state.
    // But the "Add a Building" header might stay?
    // Let's check if the Dialog closed.
    await expect(dialogTitle).not.toBeVisible();
  });
});
