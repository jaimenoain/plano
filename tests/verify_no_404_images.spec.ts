import { test, expect } from '@playwright/test';

test('Verify No 404/Self-Reference on Empty Image', async ({ page }) => {
  const buildingId = 'b-no-image';
  const pageUrl = `http://localhost:8080/building/${buildingId}`;
  const badUrlRequests: string[] = [];

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

  // 2. Network Interception & Monitoring
  // Mock Building with EMPTY image string
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (url.includes(`id=eq.${buildingId}`)) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: buildingId,
                  name: 'No Image Building',
                  location: { type: 'Point', coordinates: [0, 0] },
                  address: 'Nowhere',
                  architects: [],
                  year_completed: 2024,
                  styles: [],
                  main_image_url: "", // <-- The culprit
                  description: 'Testing empty image handling',
                  created_by: 'user-uuid'
              })
          });
      } else {
          await route.continue();
      }
  });

  await page.route('**/rest/v1/user_buildings*', async route => {
      // Mock both user specific entry (maybeSingle) and feed (array)
      // The app makes two calls to user_buildings.
      // 1. One with .maybeSingle() for user status (single object or null)
      // 2. One for feed (array)

      const url = route.request().url();
      if (url.includes('limit=1') && url.includes('single')) {
           // User status
           await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(null)
          });
      } else {
          // Feed
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  {
                      id: 'entry1',
                      content: 'Great place',
                      rating: 5,
                      status: 'visited',
                      tags: [],
                      created_at: new Date().toISOString(),
                      user: {
                          username: 'user1',
                          avatar_url: "" // Empty string avatar
                      }
                  },
                  {
                      id: 'entry2',
                      content: 'Cool',
                      rating: 4,
                      status: 'visited',
                      tags: [],
                      created_at: new Date().toISOString(),
                      user: {
                          username: 'user2',
                          avatar_url: null // Null avatar
                      }
                  }
              ])
          });
      }
  });

  // Monitor for requests that look like self-references or 404s
  page.on('request', request => {
      const url = request.url();
      // If the browser tries to fetch the page URL as an image or sub-resource (other than the initial navigation)
      // Note: Initial navigation request is type 'document'.
      if (url === pageUrl && request.resourceType() !== 'document') {
          badUrlRequests.push(`Self-reference request to ${url} with type ${request.resourceType()}`);
      }
      // Also catch obviously empty relative paths if they resolve to base
      if (url.endsWith('/building/') || url === 'http://localhost:8080/') {
         if (request.resourceType() === 'image') {
             badUrlRequests.push(`Empty image source resolving to ${url}`);
         }
      }
  });

  page.on('requestfailed', request => {
      // Filter out intentional failures or irrelevant ones
      if (request.url().includes('localhost')) {
         // console.log('Request failed:', request.url());
      }
  });

  // 3. Navigate
  await page.goto(pageUrl);
  await page.waitForLoadState('networkidle');

  // 4. Assertions

  // A. Check that no bad requests were made
  expect(badUrlRequests, `Found self-referencing requests: ${badUrlRequests.join(', ')}`).toHaveLength(0);

  // B. Check UI for Placeholder
  await expect(page.getByText('No image yet - be the first to add a photo of this building')).toBeVisible();

  // C. Ensure NO <img src=""> exists in DOM
  const brokenImages = page.locator('img[src=""]');
  await expect(brokenImages).toHaveCount(0);

  // D. Ensure NO <img src> pointing to current page exists
  // const selfRefImages = page.locator(`img[src="${pageUrl}"]`);
  // await expect(selfRefImages).toHaveCount(0);

  // E. Verify MetaHead tags
  // We might have multiple og:image tags (one from index.html, one from Helmet)
  // We just want to ensure none are empty.

  const ogImages = page.locator('meta[property="og:image"]');
  const count = await ogImages.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; ++i) {
      const content = await ogImages.nth(i).getAttribute('content');
      // Ensure content is not empty and not self-referencing
      expect(content).toBeTruthy();
      expect(content).not.toBe(pageUrl);
      if (content?.includes('localhost')) {
          expect(content).toContain('cover.jpg');
      }
  }

  console.log('Verification passed: No self-referencing image requests detected.');
});
