import { test, expect } from '@playwright/test';

test('Verify Discovery Map Full Screen Toggle', async ({ page }) => {
  // 1. Mock Session
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

  // 2. Mock Google Maps (Required for dependencies)
  await page.addInitScript(() => {
    window.google = {
      maps: {
        Map: class {
            setCenter() {}
            setZoom() {}
            addListener() {}
            getCenter() { return { lat: () => 51.5074, lng: () => -0.1278 }; }
        },
        Marker: class {
            setMap() {}
            setPosition() {}
            addListener() {}
        },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async () => ({}),
        places: {
            AutocompleteService: class {
                getPlacePredictions() { return { predictions: [] }; }
            },
            PlacesService: class {
                getDetails() {}
            }
        },
        Geocoder: class {
            geocode() { return { results: [] }; }
        }
      }
    };
  });

  // 3. Mock Network
  // Mock search_buildings RPC
  await page.route('**/rest/v1/rpc/search_buildings*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
      });
  });

  // 4. Navigate to Search Page
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/search');

  // 5. Verification

  // Wait for map container to be visible.
  // We target the visible map container (using global selector to handle Portal)
  const mapContainer = page.locator('[data-testid="map-container"]:visible');
  await expect(mapContainer).toBeVisible();

  // Find the button with title "Enter Fullscreen" within this map
  const enterBtn = mapContainer.locator('button[title="Enter Fullscreen"]');
  await expect(enterBtn).toBeVisible();

  // Click Enter Fullscreen
  await enterBtn.click();

  // Wait for state update (classes application)
  // Check for fixed inset-0 classes
  await expect(mapContainer).toHaveClass(/fixed/);
  await expect(mapContainer).toHaveClass(/inset-0/);
  await expect(mapContainer).toHaveClass(/z-\[5000\]/);

  // Check that the button title changed to "Exit Fullscreen"
  const exitBtn = mapContainer.locator('button[title="Exit Fullscreen"]');
  await expect(exitBtn).toBeVisible();

  // Take screenshot for verification
  await page.screenshot({ path: 'verification_fullscreen.png' });

  // Press ESC to exit
  await page.keyboard.press('Escape');

  // Verify it reverted
  await expect(mapContainer).not.toHaveClass(/fixed/);
  await expect(mapContainer).not.toHaveClass(/inset-0/);
  await expect(enterBtn).toBeVisible();

  // Also verify clicking the exit button works (re-enter first)
  await enterBtn.click();
  await expect(mapContainer).toHaveClass(/fixed/);
  await exitBtn.click();
  await expect(mapContainer).not.toHaveClass(/fixed/);
});
