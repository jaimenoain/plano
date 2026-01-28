import { test, expect } from '@playwright/test';

test('Feed Aggregation and Rendering', async ({ page }) => {
  // Mock Auth
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake.token.part",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: {
                onboarding_completed: true
            }
        }
    }));
  });

  // Mock RPC get_feed
  await page.route('**/rest/v1/rpc/get_feed', async route => {
    const json = [
        // 4 items to trigger clustering
        {
            id: 'review-1',
            content: 'Nice',
            rating: 5,
            created_at: new Date().toISOString(),
            user_id: 'user-1',
            user_data: { username: 'TestUser', avatar_url: null },
            building_data: { id: 'b-1', name: 'Building 1', city: 'Test City' },
            review_images: []
        },
        {
            id: 'review-2',
            content: 'Good',
            rating: 4,
            created_at: new Date(Date.now() - 1000 * 60).toISOString(),
            user_id: 'user-1',
            user_data: { username: 'TestUser', avatar_url: null },
            building_data: { id: 'b-2', name: 'Building 2', city: 'Test City' },
            review_images: []
        },
        {
            id: 'review-3',
            content: 'Great',
            rating: 3,
            created_at: new Date(Date.now() - 1000 * 120).toISOString(),
            user_id: 'user-1',
            user_data: { username: 'TestUser', avatar_url: null },
            building_data: { id: 'b-3', name: 'Building 3', city: 'Test City' },
            review_images: []
        },
        {
            id: 'review-4',
            content: 'Wow',
            rating: 5,
            created_at: new Date(Date.now() - 1000 * 180).toISOString(),
            user_id: 'user-1',
            user_data: { username: 'TestUser', avatar_url: null },
            building_data: { id: 'b-4', name: 'Building 4', city: 'Test City' },
            review_images: []
        },
    ];
    await route.fulfill({ json });
  });

  // Mock User
  await page.route('**/auth/v1/user', async route => {
    await route.fulfill({
        json: {
            id: "user-uuid",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
             user_metadata: {
                onboarding_completed: true
            }
        }
    });
  });

  await page.goto('http://localhost:8080/');

  // Expect "TestUser saved 4 buildings in Test City"
  // Note: Text content might be split across elements, so we use a loose text matcher or locate by specific parts.
  // FeedClusterCard text structure:
  // <p>
  //   <span>TestUser</span>
  //   <span> saved </span>
  //   <span>4 buildings</span>
  //   <span> in </span>
  //   <span>Test City</span>
  // </p>

  await expect(page.getByText('TestUser', { exact: true })).toBeVisible();
  await expect(page.getByText('saved', { exact: true })).toBeVisible();
  await expect(page.getByText('4 buildings')).toBeVisible();
  await expect(page.getByText('in', { exact: true })).toBeVisible();
  await expect(page.getByText('Test City')).toBeVisible();
});

test('Feed Compact Card Rating Display', async ({ page }) => {
  // Mock Auth
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake.token.part",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: {
                onboarding_completed: true
            }
        }
    }));
  });

  // Mock RPC get_feed
  await page.route('**/rest/v1/rpc/get_feed', async route => {
    const json = [
        {
            id: 'review-single',
            content: 'Nice',
            rating: 4, // Rating present
            created_at: new Date().toISOString(),
            user_id: 'user-1',
            user_data: { username: 'TestUser', avatar_url: null },
            building_data: { id: 'b-1', name: 'Single Building', city: 'Test City' },
            review_images: [] // No images -> Compact Card
        }
    ];
    await route.fulfill({ json });
  });

  // Mock User
  await page.route('**/auth/v1/user', async route => {
    await route.fulfill({
        json: {
            id: "user-uuid",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
             user_metadata: {
                onboarding_completed: true
            }
        }
    });
  });

  await page.goto('http://localhost:8080/');

  // Verify the compact card is rendered
  await expect(page.getByText('TestUser')).toBeVisible();
  await expect(page.getByText('Single Building')).toBeVisible();

  // Verify rating circles are visible
  const circles = page.locator('div').filter({ hasText: 'Single Building' }).locator('svg.lucide-circle');
  await expect(circles).toHaveCount(5);
});

test('Feed Includes Own Entries', async ({ page }) => {
  // Mock Auth
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake.token.part",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: {
                onboarding_completed: true
            }
        }
    }));
  });

  // Mock RPC get_feed to return user's own entry
  await page.route('**/rest/v1/rpc/get_feed', async route => {
    const json = [
        {
            id: 'review-own',
            content: 'My own review',
            rating: 5,
            created_at: new Date().toISOString(),
            user_id: 'user-uuid', // Matches current user
            user_data: { username: 'MySelf', avatar_url: null },
            building_data: { id: 'b-own', name: 'My Building', city: 'My City' },
            review_images: []
        }
    ];
    await route.fulfill({ json });
  });

  // Mock User
  await page.route('**/auth/v1/user', async route => {
    await route.fulfill({
        json: {
            id: "user-uuid",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
             user_metadata: {
                onboarding_completed: true
            }
        }
    });
  });

  await page.goto('http://localhost:8080/');

  // Verify the own entry is visible
  await expect(page.getByText('MySelf')).toBeVisible();
  await expect(page.getByText('My Building')).toBeVisible();
});
