import { test, expect } from '@playwright/test';

test('End-to-End Add Building Verification', async ({ page }) => {
  test.setTimeout(60000);
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => { if (response.status() === 401) console.log('401 RESPONSE:', response.url()); });

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
        places: {
          AutocompleteService: class {},
          PlacesService: class {
            findPlaceFromQuery() {}
          }
        },
        Geocoder: class {
          geocode(request, callback) {
            console.log("Mock Geocode called with", request);
            const result = [{
              formatted_address: "123 Test St, Test City, Test Country",
              address_components: [
                { types: ["locality"], long_name: "Test City" },
                { types: ["country"], long_name: "Test Country", short_name: "TC" }
              ],
              geometry: {
                location: {
                  lat: () => 51.5074,
                  lng: () => -0.1278
                }
              }
            }];
            callback(result, "OK");
          }
        },
        Map: class {
            setCenter() {}
            setZoom() {}
            addListener(event, handler) {
            }
        },
        Marker: class {
            setMap() {}
            setPosition() {}
        },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async (lib) => {
             return {};
        },
      }
    };
  });

  // Mock Taxonomy Data
  const catId = '00000000-0000-0000-0000-000000000001';
  const typId = '00000000-0000-0000-0000-000000000002';
  const grpId = '00000000-0000-0000-0000-000000000003';
  const attrId = '00000000-0000-0000-0000-000000000004';

  await page.route(/functional_categories/, async route => {
    console.log("Mock functional_categories hit!");
    await route.fulfill({ status: 200, json: [{ id: catId, name: 'Residential', slug: 'residential' }] });
  });

  await page.route(/functional_typologies/, async route => {
    console.log("Mock functional_typologies hit!");
    await route.fulfill({ status: 200, json: [{ id: typId, name: 'House', parent_category_id: catId, slug: 'house' }] });
  });

  await page.route(/attribute_groups/, async route => {
    console.log("Mock attribute_groups hit!");
    await route.fulfill({ status: 200, json: [{ id: grpId, name: 'Material', slug: 'material' }] });
  });

  await page.route(/attributes/, async route => {
    console.log("Mock attributes hit!");
    await route.fulfill({ status: 200, json: [{ id: attrId, name: 'Brick', group_id: grpId, slug: 'brick' }] });
  });

  // Mock Supabase RPC find_nearby_buildings
  await page.route('**/rest/v1/rpc/find_nearby_buildings', async route => {
    console.log("Mock find_nearby_buildings intercepted");
    const json = [
        {
            id: 'uuid-existing-1',
            name: 'Nearby Building',
            address: '10 Nearby St',
            location_lat: 51.5075,
            location_lng: -0.1279,
            dist_meters: 20,
            similarity_score: 1.0,
            main_image_url: 'http://example.com/img.jpg'
        },
        {
            id: 'uuid-existing-2',
            name: 'Test Building Duplicate Name',
            address: '500 Far Away St',
            location_lat: 52.0000,
            location_lng: -0.2000,
            dist_meters: 60000,
            similarity_score: 0.9,
            main_image_url: null
        }
    ];
    await route.fulfill({ json });
  });

  // Mock Supabase RPC search_buildings
  await page.route('**/rest/v1/rpc/search_buildings', async route => {
    console.log("Mock search_buildings intercepted");
    const json = [
        {
            id: 'uuid-existing-1',
            name: 'Nearby Building',
            address: '10 Nearby St',
            location_lat: 51.5075,
            location_lng: -0.1279,
            dist_meters: 20,
            similarity_score: 1.0,
            main_image_url: 'http://example.com/img.jpg',
        }
    ];

    await route.fulfill({ json });
  });

  // Mock Supabase Insert to buildings
  await page.route(/rest\/v1\/buildings/, async route => {
      console.log("Mock Insert intercepted", route.request().method(), route.request().url());
      if (route.request().method() === 'POST') {
          const postData = route.request().postDataJSON();
          console.log("Insert Payload:", postData);

          if (!postData.name) {
              console.error("Missing name");
              return route.abort();
          }

          await route.fulfill({
              status: 201,
              json: {
                  id: 'new-building-uuid',
                  ...postData
              }
          });
      } else if (route.request().method() === 'OPTIONS') {
           await route.fulfill({
               status: 200,
               headers: {
                   'Access-Control-Allow-Origin': '*',
                   'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                   'Access-Control-Allow-Headers': '*'
               }
           });
      } else {
          await route.continue();
      }
  });

  // Mock Supabase user_buildings
  await page.route(/user_buildings/, async route => {
       console.log("Mock user_buildings intercepted");
       await route.fulfill({ status: 200, json: [] });
  });

  // Mock Supabase Storage Upload
  await page.route(/storage\/v1\/object\/building-images/, async route => {
       await route.fulfill({
           status: 200,
           json: {
               Key: 'building-images/mock-image.jpg'
           }
       });
  });

  // Mock Supabase Architects
  await page.route(/rest\/v1\/architects/, async route => {
      await route.fulfill({ status: 200, json: [] });
  });

  // Mock Junction Tables
  await page.route(/building_architects/, async route => {
       await route.fulfill({ status: 201, json: {} });
  });
  await page.route(/building_functional_typologies/, async route => {
       await route.fulfill({ status: 201, json: {} });
  });
  await page.route(/building_attributes/, async route => {
       await route.fulfill({ status: 201, json: {} });
  });

  // 1. Navigate to page
  await page.goto('http://localhost:8080/add-building');

  // 2. Verify Map Interface (Action 1 & 2)
  await expect(page.getByText('Add a Building')).toBeVisible();

  // 3. Simulate Pin Drop (Action 2)
  const mapCanvas = page.locator('.mapboxgl-canvas, .maplibregl-canvas');
  if (await mapCanvas.count() > 0) {
      await mapCanvas.first().click({ position: { x: 300, y: 300 }, force: true });
  } else {
      await page.locator('canvas').first().click({ position: { x: 300, y: 300 }, force: true });
  }

  // Wait for duplicate check to fire
  await page.waitForTimeout(1000);

  // Verify Sidebar Duplicates do NOT have actions
  // The 'Nearby Buildings' card should appear
  await expect(page.getByText('Nearby Buildings')).toBeVisible();

  // We check that within the sidebar card, there are NO "Bucket List" or "Visited" buttons.
  // The card has the text "Nearby Buildings".
  const duplicateCard = page.locator('.space-y-6 .rounded-xl', { hasText: 'Nearby Buildings' }).first();
  // Or simpler locator if structure varies

  // Check global absence for now as these specific buttons shouldn't be on this page in this state
  await expect(page.getByRole('button', { name: 'Bucket List' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Visited' })).toHaveCount(0);

  // 5. Attempt to proceed
  await page.getByRole('button', { name: 'Continue' }).click();

  // 6. Verify Dialog
  // Wait for dialog
  await expect(page.getByText('Duplicate Building Found')).toBeVisible({ timeout: 5000 });

  const dialog = page.getByRole('dialog');
  await dialog.getByText('No, I want to create a new entry').click();
  await page.waitForTimeout(500); // Wait for animation start
  await page.keyboard.press('Escape'); // Ensure closed
  await expect(page.locator('.fixed.inset-0.z-50')).not.toBeAttached();

  // 8. Verify Step 2 (Metadata) (Action 4)
  await expect(page.getByText('Add Details')).toBeVisible();

  // 9. Fill Form
  await page.getByLabel('Name *').fill('My New Test Building');

  // Click pills to reveal
  await page.getByRole('button', { name: 'Add Year' }).click();
  await page.getByLabel('Year Built').fill('2024');

  // Architects
  await page.getByRole('button', { name: 'Add Architects' }).click();
  const architectInput = page.getByPlaceholder('Search architects or add new...');
  await architectInput.fill('Zaha Hadid');
  await architectInput.press('Enter');

  // Select Category
  await expect(page.getByText('Functional Classification')).toBeVisible();

  // Ensure pointer events are restored (Radix UI cleanup workaround)
  await page.evaluate(() => {
      document.body.style.pointerEvents = 'auto';
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => el.removeAttribute('aria-hidden'));
  });

  await page.getByLabel('Category *').dispatchEvent('click', { bubbles: true, cancelable: true });
  const option = page.getByRole('option', { name: 'Residential' });
  await option.evaluate(node => (node as HTMLElement).click());
  await page.waitForTimeout(1000); // Allow state update

  // Select Typology (wait for it to appear)
  await expect(page.getByText('House')).toBeVisible();
  await page.getByText('House').dispatchEvent('click', { bubbles: true });

  // Select Attribute
  await expect(page.getByText('Brick')).toBeVisible();
  await page.getByText('Brick').dispatchEvent('click', { bubbles: true });

  // 11. Submit
  if (await page.getByText('Saving...').count() > 0) console.log("Form is submitting prematurely!");

  const submitButton = page.locator('button[type="submit"]');
  console.log('Submit button text:', await submitButton.textContent());
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();
  await submitButton.dispatchEvent('click', { bubbles: true });

  // Check for validation errors or loading state
  await page.waitForTimeout(1000);
  if (await page.getByText('Saving...').isVisible()) console.log("Submitting...");

  const errorMessages = await page.locator('.text-destructive, [role="alert"]').allTextContents();
  if (errorMessages.length > 0) {
      console.log("Validation Errors:", errorMessages);
  }

  if (await page.getByText('You must be logged in to add a building').isVisible()) console.log("Login Error Toast Visible");
  if (await page.getByText('Category is required').isVisible()) console.log("Category Error Toast Visible");
  if (await page.getByText('At least one typology is required').isVisible()) console.log("Typology Error Toast Visible");

  // 12. Verify Success
  await expect(page.getByText('Building added successfully!')).toBeVisible({ timeout: 10000 });
});
