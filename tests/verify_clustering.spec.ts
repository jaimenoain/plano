import { test, expect } from '@playwright/test';

const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// Web Mercator Projection Helper
function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const sin = Math.sin(lat * Math.PI / 180);
  const x = (lng + 180) / 360 * 256 * Math.pow(2, zoom);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256 * Math.pow(2, zoom);
  return { x, y };
}

test('Map Clustering Verification', async ({ page }) => {
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
  const CENTER_LAT = 51.5074;
  const CENTER_LNG = -0.1278;

  // Offsets for mock items
  const CLUSTER_2_LNG = CENTER_LNG - 0.05;
  const BLDG_1_LNG = CENTER_LNG + 0.05;
  const BLDG_2_LNG = CENTER_LNG + 0.10;

  const mockClusters = [
    {
      id: 1,
      lat: CENTER_LAT,
      lng: CENTER_LNG,
      count: 50,
      is_cluster: true,
      expansion_zoom: 14
    },
    {
      id: 2,
      lat: CENTER_LAT,
      lng: CLUSTER_2_LNG,
      count: 500,
      is_cluster: true,
      expansion_zoom: 14
    },
    {
      id: "b1",
      lat: CENTER_LAT,
      lng: BLDG_1_LNG,
      count: 1,
      is_cluster: false,
      name: "Test Building 1",
      slug: "test-building-1",
      image_url: null,
      architect_names: []
    },
    {
      id: "b2",
      lat: CENTER_LAT,
      lng: BLDG_2_LNG,
      count: 1,
      is_cluster: false,
      name: "Test Building 2",
      slug: "test-building-2",
      image_url: null,
      architect_names: []
    }
  ];

  // 3. Intercept RPC calls
  let zoomRequestFound = false;
  let initialZoom = 12;

  await page.route('**/rest/v1/rpc/get_map_clusters*', async (route) => {
    const postData = route.request().postDataJSON();

    if (postData) {
      // Check if zoom level increased (for verification step)
      if (postData.zoom > initialZoom) {
        zoomRequestFound = true;
      } else {
        // Capture initial zoom for projection
        initialZoom = postData.zoom;
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockClusters),
    });
  });

  // Mock buildings query (for list hydration/details)
  await page.route('**/rest/v1/buildings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: "b1",
          name: "Test Building 1",
          location: `POINT(${BLDG_1_LNG} ${CENTER_LAT})`,
          status: "Built",
          main_image_url: null,
          slug: "test-building-1",
          architects: [],
          typologies: [],
          attributes: []
        },
        {
          id: "b2",
          name: "Test Building 2",
          location: `POINT(${BLDG_2_LNG} ${CENTER_LAT})`,
          status: "Built",
          main_image_url: null,
          slug: "test-building-2",
          architects: [],
          typologies: [],
          attributes: []
        }
      ]),
    });
  });

  // Mock user_buildings
  await page.route('**/rest/v1/user_buildings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock profiles
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: "user-uuid",
        username: "testuser",
        bio: "Test bio",
        avatar_url: null
      }),
    });
  });

  // 4. Navigate to Search Page centered on mock data
  const responsePromise = page.waitForResponse(response =>
    response.url().includes('/rpc/get_map_clusters') && response.status() === 200
  );

  await page.goto(`http://localhost:8080/search?lat=${CENTER_LAT}&lng=${CENTER_LNG}`);

  // Wait for initial data load
  await responsePromise;

  // 5. Wait for map to render
  const mapCanvas = page.locator('.maplibregl-canvas');
  await expect(mapCanvas).toBeVisible({ timeout: 10000 });

  // Wait for canvas to settle (rendering takes time after data load)
  await page.waitForTimeout(1000);

  // Calculate Projection Center (using captured zoom)
  const centerProj = project(CENTER_LAT, CENTER_LNG, initialZoom);

  // 6. Verify Cluster Interaction
  // Click center of the map (where cluster 1 is)
  // Since we center map at cluster 1 location, pixel offset is 0.

  const box = await mapCanvas.boundingBox();
  if (box) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Setup wait for zoom request before clicking
    const zoomResponsePromise = page.waitForResponse(response => {
      if (!response.url().includes('/rpc/get_map_clusters')) return false;
      const postData = response.request().postDataJSON();
      return postData && postData.zoom > initialZoom;
    });

    await page.mouse.click(centerX, centerY);

    // Wait for the zoom request to happen
    await zoomResponsePromise;
  }

  expect(zoomRequestFound, 'Expected zoom level to increase after clicking cluster').toBe(true);

  // 7. Verify Building Interaction
  // Reset view to original center
  const reloadPromise = page.waitForResponse(response =>
    response.url().includes('/rpc/get_map_clusters') && response.status() === 200
  );
  await page.goto(`http://localhost:8080/search?lat=${CENTER_LAT}&lng=${CENTER_LNG}`);
  await reloadPromise;
  await page.waitForTimeout(1000); // Wait for render

  // Re-fetch bounding box
  const box2 = await mapCanvas.boundingBox();

  if (box2) {
    const centerX = box2.x + box2.width / 2;
    const centerY = box2.y + box2.height / 2;

    // Calculate Building 1 Position relative to Center (using captured zoom)
    const bldg1Proj = project(CENTER_LAT, BLDG_1_LNG, initialZoom);
    const deltaX = bldg1Proj.x - centerProj.x;
    const deltaY = bldg1Proj.y - centerProj.y;

    const clickX = centerX + deltaX;
    const clickY = centerY + deltaY;

    // Note: Due to map tilt/rotation defaults (0), this projection matches screen pixels roughly.
    // Assuming Mapbox container size matches viewport logic.
    await page.mouse.click(clickX, clickY);
  }

  // Verify marker card appears with "Test Building 1"
  // Note: Since markers are rendered on Canvas layers (MapLibre/Mapbox), we cannot assert the presence of
  // DOM elements for clusters or markers directly (as requested by "Verify Rendering" step).
  // Instead, we rely on interaction verification:
  // 1. Clicking a cluster triggers a zoom (verified by RPC call).
  // 2. Clicking a marker triggers a popup (verified by text visibility).
  // This confirms that the elements are rendered at the correct coordinates and are interactive.
  await expect(page.getByText('Test Building 1')).toBeVisible({ timeout: 5000 });
});
