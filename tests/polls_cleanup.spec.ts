
import { test, expect } from '@playwright/test';

// Mock data
const mockGroup = {
  id: "group-1",
  slug: "my-group",
  name: "My Group",
  is_public: true,
  members: [
      { id: "m1", user: { id: "user2", username: "Tester" }, role: "admin", status: "member" }
  ],
  cycles: [],
  polls: [{ count: 0 }],
  created_by: "user2"
};

const mockUser = {
  id: "user2",
  email: "tester@cineforum.eu",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString()
};

test('verify poll creation cleanup (no tmdb, text only)', async ({ page }) => {
  // Mock Auth
  await page.addInitScript(user => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
      access_token: "fake-token",
      refresh_token: "fake-refresh-token",
      user: user,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }));
  }, mockUser);

  // Mock Groups
  await page.route('**/rest/v1/groups?*', async route => {
    await route.fulfill({ json: mockGroup });
  });

  // Mock Polls GET (handle refresh)
  let pollCreated = false;
  await page.route('**/rest/v1/polls?*', async route => {
      if (pollCreated) {
          // Return the new poll
          await route.fulfill({ json: [{
              id: "new-poll-id",
              title: "Best Framework",
              description: "Which one?",
              status: "open", // Make it open so we can vote
              type: "general",
              slug: "best-framework",
              created_by: "user2",
              questions: [{
                  id: "new-question-id",
                  question_text: "Pick one",
                  order_index: 0,
                  response_type: "text",
                  options: [
                      { id: "opt-1", option_text: "React", content_type: "text" },
                      { id: "opt-2", option_text: "Vue", content_type: "text" }
                  ]
              }],
              votes: [],
              session: null
          }] });
      } else {
          // Return empty array for list initially
          await route.fulfill({ json: [] });
      }
  });

  // Mock Poll Creation POST
  await page.route('**/rest/v1/polls*', async route => {
    if (route.request().method() === 'POST') {
      const postData = route.request().postDataJSON();
      console.log('Poll Create Data:', postData);

      // ASSERTION: Ensure no TMDB fields
      if (postData.tmdb_id) {
          throw new Error("TMDB ID found in poll creation payload!");
      }
      if (postData.movie_id) {
          throw new Error("Movie ID found in poll creation payload!");
      }

      pollCreated = true;
      await route.fulfill({ json: { id: "new-poll-id", ...postData } });
    } else {
      await route.continue();
    }
  });

  // Mock Poll Questions POST
  await page.route('**/rest/v1/poll_questions', async route => {
    if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        console.log('Question Create Data:', postData);
        // Return with ID
        await route.fulfill({ json: { id: "new-question-id", ...postData } });
    } else {
        await route.continue();
    }
  });

  // Mock Poll Options POST
  await page.route('**/rest/v1/poll_options', async route => {
    if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        console.log('Option Create Data:', postData);

        // ASSERTION: Ensure content_type is text and no weird fields
        if (postData.tmdb_id) throw new Error("TMDB ID found in option payload!");

        await route.fulfill({ json: { id: "new-option-id", ...postData } });
    } else {
        await route.continue();
    }
  });

  // Verify no TMDB API calls
  page.on('request', request => {
    if (request.url().includes('api.themoviedb.org')) {
        throw new Error(`Unexpected request to TMDB: ${request.url()}`);
    }
  });

  // Navigate to group polls page
  await page.goto('http://localhost:8080/groups/my-group/polls');
  await page.waitForLoadState('networkidle');

  console.log(await page.content()); // Debug output

  // Wait for "Add Poll" button (might be "Add Poll" or "Create First Poll")
  // The code in PollsTab.tsx shows <Button size="sm"><Plus ... /> Add Poll</Button>
  // Note: Since we return empty array for polls, and mock user is admin (created_by matches user), we should see empty state with create button
  // In PollsTab.tsx:
  // ActivePollsEmptyState renders PollDialog with trigger <Button size="lg" ...>Create First Poll</Button>
  // But also top right header has <Button size="sm">... Add Poll</Button>
  // We'll target any button with "Add Poll" or "Create First Poll"
  const createButton = page.locator('button:has-text("Add Poll"), button:has-text("Create First Poll")').first();
  await createButton.waitFor({ state: "visible", timeout: 10000 });
  await createButton.click();

  // Wait for dialog
  await expect(page.locator('h2:has-text("Create New Poll")')).toBeVisible();

  // Fill form
  await page.fill('input[name="title"]', 'Best Framework');
  await page.fill('textarea[name="description"]', 'Which one?');

  // Fill Question
  await page.fill('input[name="questions.0.question_text"]', 'Pick one');

  // Fill Options
  // Option 0
  await page.fill('input[name="questions.0.options.0.value"]', 'React');
  // Option 1
  await page.fill('input[name="questions.0.options.1.value"]', 'Vue');

  // Verify "Building" radio is GONE
  // The label "Building" should not be associated with a visible radio button in the response type group
  const buildingLabel = page.locator('label:has-text("Building")');
  await expect(buildingLabel).not.toBeVisible();

  // Submit
  await page.click('button:has-text("Publish Poll")');

  // Wait for success toast or closure or dialog to close
  // We prioritize checking if the request was sent (pollCreated)
  // The toast might be flaky in test environment

  // Wait a bit for async operations
  await page.waitForTimeout(2000);

  expect(pollCreated).toBe(true);
});
