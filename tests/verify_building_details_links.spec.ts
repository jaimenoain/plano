import { test, expect } from '@playwright/test';

test('Verify Building Details Architect Links', async ({ page }) => {
  // 1. Setup Mock User Session
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

  // 2. Mock Google Maps API (needed for BuildingMap component)
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
      }
    };
  });

  // 3. Network Interception
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (url.includes('id=eq.mock-building-id')) {
          await route.fulfill({
              status: 200,
              json: {
                  id: 'mock-building-id',
                  name: 'Test Relational Building',
                  location: 'POINT(-0.1278 51.5074)',
                  address: 'London, UK',
                  architects: ['Legacy Name'], // This should be ignored/overridden or displayed if fallback logic is used
                  year_completed: 2024,
                  styles: ['Modern'],
                  main_image_url: null,
                  created_by: 'user-uuid'
              }
          });
      } else {
          await route.continue();
      }
  });

  await page.route('**/rest/v1/building_architects*', async route => {
      // Expecting query for building_architects joined with architects
      // URL pattern usually includes select=architect:architects(...) and building_id=eq.mock-building-id
      const url = route.request().url();
      if (url.includes('building_id=eq.mock-building-id')) {
          await route.fulfill({
              status: 200,
              json: [
                  {
                      architect: {
                          id: 'arch-1',
                          name: 'Relational Architect One'
                      }
                  },
                  {
                      architect: {
                          id: 'arch-2',
                          name: 'Relational Architect Two'
                      }
                  }
              ]
          });
      } else {
          await route.continue();
      }
  });

  // Mock user_buildings to avoid errors/delays
  await page.route('**/rest/v1/user_buildings*', async route => {
       await route.fulfill({ status: 200, json: [] });
  });

  // 4. Navigate
  await page.goto('http://localhost:8080/building/mock-building-id');

  // 5. Assertions
  // Wait for building name
  await expect(page.getByRole('heading', { name: 'Test Relational Building' })).toBeVisible();

  // Verify Links exist for Relational Architects
  const arch1 = page.getByRole('link', { name: 'Relational Architect One' });
  await expect(arch1).toBeVisible();
  await expect(arch1).toHaveAttribute('href', '/architect/arch-1');

  const arch2 = page.getByRole('link', { name: 'Relational Architect Two' });
  await expect(arch2).toBeVisible();
  await expect(arch2).toHaveAttribute('href', '/architect/arch-2');

  // Verify Legacy Name is NOT shown (if we prioritize relational) OR is shown (if we merge)
  // The plan is to prioritize relational if present.
  // "If relational data exists... render a clickable Link... If only the string array exists... fall back"
  // This implies if relational exists, we use it. If we use it, we probably don't show the string array.
  await expect(page.getByText('Legacy Name')).not.toBeVisible();
});
