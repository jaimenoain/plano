import { test, expect } from '@playwright/test';

test('Verify Drag and Drop on Write Review Page', async ({ page }) => {
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

  const buildingId = '00000000-0000-0000-0000-000000000123';

  // 2. Mock Network Requests
  await page.route('**', async route => {
    const url = route.request().url();

    // Pass through auth user check
    if (url.includes('auth/v1/user')) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: "user-uuid",
                email: "test@example.com",
                aud: "authenticated",
                role: "authenticated"
            })
        });
        return;
    }

    // Mock Building Details
    if (url.includes(`rest/v1/buildings`) && (url.includes(`id=eq.${buildingId}`) || url.includes(`short_id=eq.123`))) {
       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: buildingId,
              name: 'Test Building',
              slug: 'test-building',
              short_id: 123,
              location: null,
              address: '123 Test St',
              created_by: 'other-user',
              main_image_url: null,
              styles: [{ style: { id: 'style-1', name: 'Modern' } }],
              year_completed: 2020,
              description: 'A test building'
          })
       });
       return;
    }

    // Mock other requests to prevent errors
    if (url.includes('rest/v1/user_buildings') && route.request().method() === 'GET') {
       await route.fulfill({ status: 200, body: 'null' });
       return;
    }

    if (url.includes('rest/v1/building_architects')) {
         await route.fulfill({ status: 200, body: '[]' });
         return;
    }

    try {
        await route.continue();
    } catch (e) {
        // ignore
    }
  });

  // 3. Go to Review Page
  await page.goto(`http://localhost:8080/building/${buildingId}/review`);
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // 4. Simulate Drag Enter to show overlay
  // We need to simulate a DragEvent with types containing "Files"
  await page.evaluate(() => {
    const event = new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    // @ts-ignore
    event.dataTransfer.items.add(new File([''], 'test.png', { type: 'image/png' }));
    // We also need to set types manually because some browsers rely on it
    // But DataTransfer constructor in jsdom/browser might differ.
    // Usually dragging from OS has "Files" in types.
    // Let's try to trust the event or force it.
    window.dispatchEvent(event);
  });

  // Check if overlay appears
  // Use a locator that finds the overlay text we plan to add
  await expect(page.getByText('Drop images here')).toBeVisible();

  // 5. Simulate Drop
  await page.evaluate(async () => {
    const dataTransfer = new DataTransfer();
    const file = new File(['(binary data)'], 'test-drop.jpg', { type: 'image/jpeg' });
    dataTransfer.items.add(file);

    const event = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    });
    window.dispatchEvent(event);
  });

  // 6. Verify Image Added
  // The overlay should disappear
  await expect(page.getByText('Drop images here')).not.toBeVisible();

  // An image preview should appear
  await expect(page.locator('img[alt="Preview"]')).toBeVisible();
});
