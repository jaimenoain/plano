import { test, expect } from '@playwright/test';

test('Verify Internal Discovery Engine (Forensic Audit)', async ({ page }) => {
  // 1. Setup Mock User Session (using the same as verify_scoring)
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-gyxspsuctbrxhwiyfvlj-auth-token', JSON.stringify({
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

  // 2. Mock Google Maps API (essential as per memory)
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

  // 3. Network Interception & Spy
  const tmdbCalls: string[] = [];
  await page.route('**', async route => {
      const url = route.request().url();

      // Log external calls
      if (url.includes('themoviedb.org') || url.includes('tmdb')) {
          tmdbCalls.push(url);
          console.error('🚨 TMDB CALL DETECTED:', url);
          await route.abort(); // Block it to be safe
          return;
      }

      // Mock Search RPC
      if (url.includes('rpc/search_buildings')) {
          console.log('Intercepted search_buildings RPC call');
          const postData = route.request().postDataJSON();
          console.log('Payload:', postData);

          // Return mock data based on query
          if (postData.query_text === 'Zaha Hadid') {
               await route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify([{
                      id: 'building-1',
                      name: 'Heydar Aliyev Center',
                      location_lat: 40.4135,
                      location_lng: 49.8698,
                      address: 'Baku, Azerbaijan',
                      main_image_url: 'https://example.com/zaha.jpg',
                      architects: ['Zaha Hadid'],
                      styles: ['Neo-Futurism'],
                      city: 'Baku',
                      country: 'Azerbaijan',
                      social_score: 100
                  }])
               });
               return;
          }

          if (postData.query_text === 'Brutalist' || (postData.filters && postData.filters.styles && postData.filters.styles.includes('Brutalist'))) {
              await route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify([{
                      id: 'building-2',
                      name: 'National Theatre',
                      location_lat: 51.5071,
                      location_lng: -0.1143,
                      address: 'London, UK',
                      main_image_url: 'https://example.com/national.jpg',
                      architects: ['Denys Lasdun'],
                      styles: ['Brutalist'],
                      city: 'London',
                      country: 'UK',
                      social_score: 90
                  }])
               });
               return;
          }

          // Default empty
          await route.fulfill({ status: 200, body: JSON.stringify([]) });
          return;
      }

      // Mock get_discovery_filters
      if (url.includes('rpc/get_discovery_filters')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  cities: ['Baku', 'London'],
                  styles: ['Neo-Futurism', 'Brutalist']
              })
          });
          return;
      }

      await route.continue();
  });

  // 4. Test Execution
  console.log('Navigating to /search...');
  await page.setViewportSize({ width: 1280, height: 720 }); // Force Desktop
  await page.goto('http://localhost:8080/search');

  // Verify Page Loaded
  await expect(page.getByPlaceholder('Search buildings, architects...')).toBeVisible();

  // Test 1: Architect Search
  console.log('Testing Architect Search...');
  await page.getByPlaceholder('Search buildings, architects...').fill('Zaha Hadid');

  // Wait for results
  // Note: Scoping to Desktop container (.md:grid) and specific role to ensure uniqueness
  await expect(page.locator('.md\\:grid').getByRole('heading', { name: 'Heydar Aliyev Center' })).toBeVisible({ timeout: 5000 });

  // Test 2: Style Search (via text for now as it's easier to type)
  console.log('Testing Style Search...');
  // Clear first
  await page.getByPlaceholder('Search buildings, architects...').fill('');
  await page.getByPlaceholder('Search buildings, architects...').fill('Brutalist');

  // Wait for results
  await expect(page.locator('.md\\:grid').getByRole('heading', { name: 'National Theatre' })).toBeVisible({ timeout: 5000 });

  // 5. Verify No TMDB Calls
  expect(tmdbCalls.length, 'Should have ZERO calls to TMDB').toBe(0);
});
