import { test, expect } from '@playwright/test';

test('Verify Building Details Layout (Map > Address > Image)', async ({ page }) => {
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

  // 2. Mock Google Maps
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
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (url.includes('id=eq.00000000-0000-0000-0000-000000000001')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: '00000000-0000-0000-0000-000000000001',
                  name: 'Test Building',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '123 Test St, London',
                  city: 'London',
                  country: 'UK',
                  // architects is fetched separately now, but keeping it here harmlessly if needed by legacy
                  architects: [],
                  year_completed: 2020,
                  // styles must match the nested structure expected by fetchBuildingDetails
                  styles: [{ style: { id: 'style1', name: 'Modern' } }],
                  main_image_url: 'https://example.com/image.jpg',
                  description: 'A test building',
                  created_by: 'user-other'
              })
          });
      } else {
          await route.continue();
      }
  });

  await page.route('**/rest/v1/user_buildings*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
                id: 'entry1',
                content: 'Nice',
                rating: 5,
                status: 'visited',
                tags: [],
                created_at: new Date().toISOString(),
                user: { username: 'testuser', avatar_url: null },
                images: [{ id: 'img1', storage_path: 'path/to/img.jpg', likes_count: 5 }]
            }
          ])
      });
  });

  // Mock image storage
  await page.route('**/storage/v1/object/public/**', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('fake-image-data')
      });
  });

  await page.route('**/rest/v1/building_architects*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
              { architect: { id: 'arch1', name: 'Test Architect' } }
          ])
      });
  });

  // 4. Navigate
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/building/00000000-0000-0000-0000-000000000001');

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // Check Left Column Children Order
  const mapContainer = page.locator('.h-48');
  const addressText = page.getByText('London, UK');
  const image = page.getByRole('img', { name: 'Test Building' });

  await expect(mapContainer).toBeVisible();
  await expect(addressText).toBeVisible();
  await expect(image).toBeVisible();

  const mapBox = await mapContainer.boundingBox();
  const addressBox = await addressText.boundingBox();
  const imageBox = await image.boundingBox();

  if (!mapBox || !addressBox || !imageBox) throw new Error("Elements not found");

  console.log('Map Y:', mapBox.y);
  console.log('Address Y:', addressBox.y);
  console.log('Image Y:', imageBox.y);

  // Assert Order: Map < Address < Image
  expect(mapBox.y).toBeLessThan(addressBox.y);
  expect(addressBox.y).toBeLessThan(imageBox.y);
});
