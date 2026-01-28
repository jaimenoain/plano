import { test, expect } from '@playwright/test';

test('Verify Building Images Layout (Vertical Stack & Sorted by Likes)', async ({ page }) => {
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
        places: { AutocompleteService: class {}, PlacesService: class {} },
        Geocoder: class { geocode() { return { results: [] }; } }
      }
    };
  });

  const buildingId = '00000000-0000-0000-0000-000000000001';

  // 3. Mock Network
  // Building Details
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (url.includes(`id=eq.${buildingId}`)) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: buildingId,
                  name: 'Test Building with Images',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '123 Test St, London',
                  created_by: 'user-other',
                  main_image_url: null,
                  styles: []
              })
          });
      } else {
          await route.continue();
      }
  });

  // Architects
  await page.route('**/rest/v1/building_architects*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
      });
  });

  // User Buildings (Feed/Reviews)
  // We want to return multiple entries, with images having different like counts.
  // Entry 1: 1 image, 10 likes. Created recently.
  // Entry 2: 1 image, 50 likes. Created older.
  // Entry 3: 1 image, 5 likes. Created very recently.
  // Expected order: Entry 2 (50 likes), Entry 1 (10 likes), Entry 3 (5 likes).

  await page.route('**/rest/v1/user_buildings*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
              {
                  id: 'entry1',
                  user_id: 'u1',
                  content: 'Review 1',
                  rating: 4,
                  status: 'visited',
                  tags: [],
                  created_at: '2023-01-02T10:00:00Z',
                  user: { username: 'user1', avatar_url: null },
                  images: [
                      { id: 'img1', storage_path: 'path/img1.jpg', likes_count: 10 }
                  ]
              },
              {
                  id: 'entry2',
                  user_id: 'u2',
                  content: 'Review 2',
                  rating: 5,
                  status: 'visited',
                  tags: [],
                  created_at: '2023-01-01T10:00:00Z',
                  user: { username: 'user2', avatar_url: null },
                  images: [
                      { id: 'img2', storage_path: 'path/img2.jpg', likes_count: 50 }
                  ]
              },
              {
                  id: 'entry3',
                  user_id: 'u3',
                  content: 'Review 3',
                  rating: 3,
                  status: 'visited',
                  tags: [],
                  created_at: '2023-01-03T10:00:00Z',
                  user: { username: 'user3', avatar_url: null },
                  images: [
                      { id: 'img3', storage_path: 'path/img3.jpg', likes_count: 5 }
                  ]
              }
          ])
      });
  });

  // Mock Top Links (RPC)
  await page.route('**/rpc/get_building_top_links', async route => {
       await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });

  // Mock Follows
  await page.route('**/rest/v1/follows*', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });

  // 4. Navigate
  await page.goto(`http://localhost:8080/building/${buildingId}`);

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'Test Building with Images' })).toBeVisible();

  // Wait for images to load
  // The images are rendered in the Left column.
  // We need to check their order and layout.

  // In the current implementation (Carousel), only one image is visible at a time (usually), or they are in a slider.
  // The test expects them to be STACKED.

  // Get all images in the visuals section.
  // We can identify the visuals section because it's in the left column.
  // Or we can look for images with specific src.
  // Ideally, we want to find the container that holds these images.

  // Let's assume the images will have src ending with the ID (due to mock URL generation usually being stubbed or predictable if we mock the utility).
  // Actually, getBuildingImageUrl logic: if it's a path, it prepends S3 url.
  // The mock returns `path/img1.jpg`.
  // So the src will contain `path/img1.jpg`.

  // Refine locators to target only the main visuals (left column)
  // These images use the building name as alt text
  const img1 = page.locator('img[alt="Test Building with Images"][src*="path/img1.jpg"]');
  const img2 = page.locator('img[alt="Test Building with Images"][src*="path/img2.jpg"]');
  const img3 = page.locator('img[alt="Test Building with Images"][src*="path/img3.jpg"]');

  // Check if all images are present in the DOM
  // Note: In the Carousel implementation, only the first image (or active one) might be visible/attached depending on Carousel implementation.
  // But usually carousel renders all slides but hides them.
  // If use "toBeVisible()", it will fail for carousel hidden slides.
  // We'll use this failure to confirm current state (if they are hidden).

  // Actually, we want to confirm the FUTURE state.
  // So let's construct expectations that pass for the FUTURE state.
  // Then run it now, and see it FAIL.

  // Future state: All images visible.
  await expect(img1).toBeVisible();
  await expect(img2).toBeVisible();
  await expect(img3).toBeVisible();

  // Check Sorting: 50 likes -> 10 likes -> 5 likes
  // img2 -> img1 -> img3

  const leftColumn = page.locator('.lg\\:grid > div').first();

  // Evaluation:
  const srcs = await leftColumn.locator('img[alt="Test Building with Images"]').evaluateAll(imgs => imgs.map(i => i.src));
  // Filter only our images
  const reviewImageSrcs = srcs.filter(src => src.includes('path/img'));

  expect(reviewImageSrcs.length).toBe(3);
  expect(reviewImageSrcs[0]).toContain('img2.jpg'); // 50 likes
  expect(reviewImageSrcs[1]).toContain('img1.jpg'); // 10 likes
  expect(reviewImageSrcs[2]).toContain('img3.jpg'); // 5 likes

  // Check Layout: Vertical Stack vs Carousel
  // If it's a carousel, there would be `.carousel` class or buttons.
  // We want to verify there is NO carousel.
  const carousel = page.locator('[role="region"][aria-roledescription="carousel"]');
  await expect(carousel).toHaveCount(0);

  // Verify all images are visible (not hidden by carousel overflow)
  // In a carousel, usually only the active one is visible.
  await expect(img1).toBeVisible();
  await expect(img2).toBeVisible();
  await expect(img3).toBeVisible();

  // Bounding Box check: Vertical stacking
  // img2 (top) should be above img1.
  const box2 = await img2.boundingBox();
  const box1 = await img1.boundingBox();

  expect(box2).not.toBeNull();
  expect(box1).not.toBeNull();

  if (box2 && box1) {
      // box2.y should be less than box1.y
      expect(box2.y + box2.height).toBeLessThanOrEqual(box1.y + 100); // allow some overlap/gap margin but definitely 2 is above 1
  }

});
