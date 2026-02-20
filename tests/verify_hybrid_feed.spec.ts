import { test, expect } from '@playwright/test';

// JWT with exp: 9999999999 (approx year 2286), sub: user-uuid
const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjk5OTk5OTk5OTl9.dummy_signature";

const MOCK_USER = {
  id: "user-uuid",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2020-01-01T00:00:00Z",
  email_confirmed_at: "2020-01-01T00:00:00Z",
  last_sign_in_at: "2020-01-01T00:00:00Z",
  app_metadata: {
    provider: "email",
    providers: ["email"]
  },
  user_metadata: {
      onboarding_completed: true
  },
  identities: []
};

const MOCK_SUGGESTED_POSTS = [
    {
        id: "s1",
        content: "Suggested Post 1",
        rating: 5,
        created_at: new Date().toISOString(),
        user_id: "suggested-user-1",
        building_data: {
            id: "b1",
            name: "Suggested Building 1",
            address: "123 Main St, City",
            main_image_url: "http://example.com/image1.jpg"
        },
        user_data: {
            username: "suggested_user_1",
            avatar_url: null
        },
        likes_count: 10,
        comments_count: 2,
        is_liked: false,
        is_suggested: true,
        suggestion_reason: "popular"
    },
    {
        id: "s2",
        content: "Suggested Post 2",
        rating: 4,
        created_at: new Date().toISOString(),
        user_id: "suggested-user-2",
        building_data: {
            id: "b2",
            name: "Suggested Building 2",
            address: "456 Oak St, City",
            main_image_url: "http://example.com/image2.jpg"
        },
        user_data: {
            username: "suggested_user_2",
            avatar_url: null
        },
        likes_count: 5,
        comments_count: 1,
        is_liked: false,
        is_suggested: true,
        suggestion_reason: "popular"
    },
    {
        id: "s3",
        content: "Suggested Post 3",
        rating: 3,
        created_at: new Date().toISOString(),
        user_id: "suggested-user-3",
        building_data: {
            id: "b3",
            name: "Suggested Building 3",
            address: "789 Pine St, City",
            main_image_url: "http://example.com/image3.jpg"
        },
        user_data: {
            username: "suggested_user_3",
            avatar_url: null
        },
        likes_count: 2,
        comments_count: 0,
        is_liked: false,
        is_suggested: true,
        suggestion_reason: "popular"
    },
     {
        id: "s4",
        content: "Suggested Post 4",
        rating: 5,
        created_at: new Date().toISOString(),
        user_id: "suggested-user-4",
        building_data: {
            id: "b4",
            name: "Suggested Building 4",
            address: "101 Maple St, City",
            main_image_url: "http://example.com/image4.jpg"
        },
        user_data: {
            username: "suggested_user_4",
            avatar_url: null
        },
        likes_count: 20,
        comments_count: 5,
        is_liked: false,
        is_suggested: true,
        suggestion_reason: "popular"
    }
];

const MOCK_SOCIAL_POSTS = [
    {
        id: "p1",
        content: "Social Post 1",
        rating: 5,
        created_at: new Date().toISOString(),
        user_id: "friend-user-1",
        building_data: {
            id: "b10",
            name: "Social Building 1",
            address: "Social St 1",
            main_image_url: "http://example.com/social1.jpg"
        },
        user_data: {
            username: "friend_user_1",
            avatar_url: null
        },
        likes_count: 3,
        comments_count: 0,
        is_liked: true,
        is_suggested: false
    },
    {
        id: "p2",
        content: "Social Post 2",
        rating: 4,
        created_at: new Date().toISOString(),
        user_id: "friend-user-2",
        building_data: {
            id: "b11",
            name: "Social Building 2",
            address: "Social St 2",
            main_image_url: "http://example.com/social2.jpg"
        },
        user_data: {
            username: "friend_user_2",
            avatar_url: null
        },
        likes_count: 1,
        comments_count: 0,
        is_liked: false,
        is_suggested: false
    },
    {
        id: "p3",
        content: "Social Post 3",
        rating: 3,
        created_at: new Date().toISOString(),
        user_id: "friend-user-3",
        building_data: {
            id: "b12",
            name: "Social Building 3",
            address: "Social St 3",
            main_image_url: "http://example.com/social3.jpg"
        },
        user_data: {
            username: "friend_user_3",
            avatar_url: null
        },
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
        is_suggested: false
    }
];

const MOCK_PEOPLE_YOU_MAY_KNOW = [
    {
        id: "suggested-user-1",
        username: "suggested_user_1",
        avatar_url: null,
        mutual_count: 2,
        group_mutual_count: 1,
        is_follows_me: false
    },
    {
        id: "suggested-user-2",
        username: "suggested_user_2",
        avatar_url: null,
        mutual_count: 1,
        group_mutual_count: 0,
        is_follows_me: false
    }
];

test.describe('Hybrid Feed Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Common Endpoints
    await page.route('**/rest/v1/review_images*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('**/rest/v1/image_likes*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('**/rest/v1/profiles*', async (route) => {
         await route.fulfill({
            status: 200,
            body: JSON.stringify({ id: MOCK_USER.id, username: "testuser", bio: "Test bio" })
        });
    });
    await page.route('**/rest/v1/rpc/get_people_you_may_know*', async (route) => {
         await route.fulfill({ status: 200, body: JSON.stringify(MOCK_PEOPLE_YOU_MAY_KNOW) });
    });
    // This handles GET /rest/v1/follows?follower_id=...
    await page.route('**/rest/v1/follows*', async (route) => {
        if (route.request().method() === 'GET') {
             // Return empty array for mutual follows check in PeopleYouMayKnow
             await route.fulfill({ status: 200, body: JSON.stringify([]) });
        } else {
             await route.continue();
        }
    });

    // Mock Notifications (for follow action)
    await page.route('**/rest/v1/notifications*', async (route) => {
        await route.fulfill({ status: 201, body: JSON.stringify({}) });
    });

    // Mock Auth User endpoint to prevent token validation failure
    await page.route('**/auth/v1/**', async (route) => {
        console.log(`Auth Request: ${route.request().method()} ${route.request().url()}`);

        if (route.request().url().includes('/user')) {
             await route.fulfill({
                status: 200,
                body: JSON.stringify(MOCK_USER)
            });
        } else if (route.request().url().includes('/token')) {
             await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    access_token: DUMMY_JWT,
                    token_type: "bearer",
                    expires_in: 3600,
                    refresh_token: "fake-refresh",
                    user: MOCK_USER
                })
            });
        } else {
            await route.fulfill({ status: 200, body: JSON.stringify({}) });
        }
    });

    // Console logs
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

    // Set up Authentication via LocalStorage
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

  test('Test 1 (Cold Start): Verify EmptyFeed and Suggested Content', async ({ page }) => {
    // Mock get_feed to return empty
    await page.route('**/rest/v1/rpc/get_feed*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    // Mock get_suggested_posts
    await page.route('**/rest/v1/rpc/get_suggested_posts*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(MOCK_SUGGESTED_POSTS) });
    });

    await page.goto('http://localhost:8080/');

    // Verify "Welcome to Plano!" message (EmptyFeed indicator)
    await expect(page.getByText('Welcome to Plano!')).toBeVisible({ timeout: 10000 });

    // Verify Suggested Post 1 is visible
    await expect(page.getByText('Suggested Post 1')).toBeVisible();

    // Verify People You May Know section is visible
    await expect(page.getByText('People you may know')).toBeVisible();

    // Verify at least one person in the carousel
    // Use .first() to avoid strict mode violation if multiple elements match
    await expect(page.getByText('suggested_user_1').first()).toBeVisible();
  });

  test('Test 2 (Hybrid Transition): Verify AllCaughtUpDivider and Hybrid Feed', async ({ page }) => {
    // Mock get_feed to return 3 posts
    await page.route('**/rest/v1/rpc/get_feed*', async (route) => {
        console.log('Test 2: Intercepted get_feed');
        await route.fulfill({ status: 200, body: JSON.stringify(MOCK_SOCIAL_POSTS) });
    });

    // Mock get_suggested_posts
    await page.route('**/rest/v1/rpc/get_suggested_posts*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(MOCK_SUGGESTED_POSTS) });
    });

    await page.goto('http://localhost:8080/');

    // Verify Social Posts are visible (Compact cards show Building Name, not review content)
    await expect(page.getByText('Social Building 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Social Building 3')).toBeVisible();

    // Verify All Caught Up Divider
    await expect(page.getByText("You're all caught up!")).toBeVisible();

    // Verify Suggested Posts are visible after the divider
    await expect(page.getByText('Suggested Post 1')).toBeVisible();
  });

  test('Test 3 (Inline Follow): Verify Follow Button Interaction', async ({ page }) => {
    // Using Cold Start setup for simplicity to access suggested posts directly
    await page.route('**/rest/v1/rpc/get_feed*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.route('**/rest/v1/rpc/get_suggested_posts*', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(MOCK_SUGGESTED_POSTS) });
    });

    // Intercept Follow Request
    let followRequestMade = false;
    // MATCHES BOTH GET AND POST because of * wildcard
    await page.route('**/rest/v1/follows*', async (route) => {
        const method = route.request().method();
        const url = route.request().url();
        console.log(`Follows Request: ${method} ${url}`);

        if (method === 'POST') {
            const postData = route.request().postDataJSON();
            if (postData.following_id === 'suggested-user-1') {
                followRequestMade = true;
            }
            await route.fulfill({ status: 201, body: JSON.stringify({}) });
        } else if (method === 'GET') {
             // GET request for follow status (return null = not following)
             await route.fulfill({ status: 200, body: JSON.stringify([]) });
        } else if (method === 'DELETE') {
             await route.fulfill({ status: 204, body: JSON.stringify({}) });
        } else {
             await route.continue();
        }
    });

    await page.goto('http://localhost:8080/');

    // Find Follow button for Suggested Post 1
    // The FollowButton is inside the Header.
    // We can target it by text "Follow" inside the card containing "Suggested Post 1".

    // Locate the card
    const card = page.locator('article').filter({ hasText: 'Suggested Post 1' });
    const followButton = card.getByRole('button', { name: 'Follow' }).first();

    await expect(followButton).toBeVisible();

    // Click Follow
    await followButton.click();

    // Verify request was made
    // Wait for a bit to allow the async operation to complete
    await page.waitForTimeout(500);
    expect(followRequestMade).toBe(true);

    // Verify button disappears (because hideIfFollowing is true in ReviewCard)
    await expect(followButton).toBeHidden();
  });

});
