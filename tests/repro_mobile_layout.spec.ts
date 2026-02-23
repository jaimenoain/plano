import { test, expect } from '@playwright/test';

// JWT and User mocks
const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjk5OTk5OTk5OTl9.dummy_signature";
const MOCK_USER = {
  id: "user-uuid",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2020-01-01T00:00:00Z",
  user_metadata: { onboarding_completed: true },
};

// Helper to generate feed items
const generateFeedItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i}`,
    content: `Post Content ${i}`,
    rating: 5,
    created_at: new Date().toISOString(),
    user_id: `user-${i}`,
    building_data: {
      id: `b-${i}`,
      name: `Building ${i}`,
      address: `Address ${i}`,
      city: `City ${i}`,
      main_image_url: `http://example.com/img${i}.jpg`
    },
    user_data: {
      username: `user_${i}`,
      avatar_url: null
    },
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    is_suggested: false
  }));
};

const MOCK_DISCOVERY_BUILDINGS = [
  {
    id: "d1",
    name: "Discovery Building 1",
    slug: "discovery-1",
    main_image_url: "http://example.com/d1.jpg",
    city: "Paris",
    country: "France",
    save_count: 100
  },
  {
    id: "d2",
    name: "Discovery Building 2",
    slug: "discovery-2",
    main_image_url: "http://example.com/d2.jpg",
    city: "London",
    country: "UK",
    save_count: 80
  }
];

test.describe('Mobile Feed Layout', () => {
  // Enforce mobile viewport
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    // Mock Auth
    await page.route('**/auth/v1/user', async (route) => route.fulfill({ status: 200, body: JSON.stringify(MOCK_USER) }));
    await page.route('**/auth/v1/token?*', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ access_token: DUMMY_JWT, user: MOCK_USER }) }));

    // Mock Profile
    await page.route('**/rest/v1/profiles*', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ id: MOCK_USER.id, username: "testuser" }) }));

    // Mock Feed (RPC) - Return 15 items to trigger the injection at index 10
    await page.route('**/rest/v1/rpc/get_feed*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(generateFeedItems(15)) });
    });

    // Mock Discovery Feed (RPC)
    await page.route('**/rest/v1/rpc/get_discovery_feed*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(MOCK_DISCOVERY_BUILDINGS) });
    });

    // Mock auxiliary tables
    await page.route('**/rest/v1/review_images*', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/image_likes*', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/building_architects*', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/follows*', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/rpc/get_people_you_may_know*', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));

    // Init Auth
    await page.addInitScript(({ token, user }) => {
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: token,
            refresh_token: "fake-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: user
        }));
    }, { token: DUMMY_JWT, user: MOCK_USER });
  });

  test('Verify ExploreTeaserBlock layout alignment', async ({ page }) => {
    await page.goto('http://localhost:8082/');

    // Wait for the teaser block to appear
    const teaserBlock = page.locator('text=Trending Architecture').first();
    await expect(teaserBlock).toBeVisible({ timeout: 10000 });

    // Wait a bit for layout stability
    await page.waitForTimeout(1000);

    // Get viewport width
    const viewportWidth = page.viewportSize()?.width || 375;

    // Check for horizontal scroll on the body/html
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    console.log(`Viewport Width: ${viewportWidth}`);
    console.log(`Scroll Width: ${scrollWidth}`);
    console.log(`Client Width: ${clientWidth}`);

    // If scrollWidth > clientWidth, we have an overflow issue.
    // However, since AppLayout has overflow-x-hidden, specific scrollWidth might be hidden.
    // We should check if the teaser block extends outside the viewport.

    // Locate the container of the horizontal scroll list
    const carousel = page.locator('.snap-x').first();
    const box = await carousel.boundingBox();

    if (!box) throw new Error("Carousel box not found");

    console.log('Carousel BoundingBox:', box);

    // Verify negative margin effect
    // If the parent has px-2 (8px), and carousel has -mx-4 (-16px),
    // it should start at x = -8px relative to the viewport.

    // We expect it to be 0 if correctly implemented (full bleed), or negative if broken.
    // Actually, if it's full bleed, x should be 0 and width should be viewportWidth.

    // Current Broken State Prediction:
    // Parent padding: 8px.
    // Element margin: -16px.
    // Element x position relative to viewport: 8px + (-16px) = -8px.

    // Correct State Prediction (with px-4):
    // Parent padding: 16px.
    // Element margin: -16px.
    // Element x position: 16px + (-16px) = 0px.

    expect(box.x).toBeGreaterThanOrEqual(-1); // Allow small sub-pixel diffs
    expect(box.width).toBeLessThanOrEqual(viewportWidth + 1);

    // Scroll to view for screenshot
    await teaserBlock.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'mobile_feed_layout.png' });
  });

  test('Verify ExploreTeaserBlock layout alignment on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('http://localhost:8082/');

    const teaserBlock = page.locator('text=Trending Architecture').first();
    await expect(teaserBlock).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const carousel = page.locator('.snap-x').first();
    const box = await carousel.boundingBox();

    if (!box) throw new Error("Carousel box not found");

    // On desktop, it should be contained within the parent (px-6).
    // Parent width approx 66% of 1024 (w-2/3) minus gap minus sidebar.
    // It definitely should NOT be full screen width.
    expect(box.width).toBeLessThan(1024);
    expect(box.x).toBeGreaterThan(0); // Should have margin/padding
  });
});
