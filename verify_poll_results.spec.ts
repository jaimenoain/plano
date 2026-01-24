
import { test, expect } from '@playwright/test';

// Mock data
const mockPoll = {
  id: "poll-1",
  title: "Quiz Time",
  description: "Test your knowledge",
  slug: "quiz-time",
  group_id: "group-1",
  status: "open",
  type: "quiz",
  show_results_before_close: true,
  questions: [
    {
      id: "q1",
      question_text: "What is the capital of France?",
      order_index: 0,
      options: [
        { id: "o1", option_text: "London", is_correct: false },
        { id: "o2", option_text: "Paris", is_correct: true },
        { id: "o3", option_text: "Berlin", is_correct: false }
      ]
    },
    {
      id: "q2",
      question_text: "Which planet is the Red Planet?",
      order_index: 1,
      options: [
        { id: "o4", option_text: "Mars", is_correct: true },
        { id: "o5", option_text: "Jupiter", is_correct: false }
      ]
    }
  ],
  votes: [
    { question_id: "q1", option_id: "o1", user_id: "user1", profiles: { username: "Alice", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" } },
    { question_id: "q1", option_id: "o2", user_id: "user2", profiles: { username: "Bob", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" } },
    { question_id: "q1", option_id: "o2", user_id: "user3", profiles: { username: "Charlie", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" } },
    { question_id: "q2", option_id: "o4", user_id: "user1", profiles: { username: "Alice", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" } },
  ],
  session: { status: "open" }
};

const mockGroup = {
  id: "group-1",
  slug: "my-group",
  name: "My Group",
  is_public: true, // Make public to avoid join logic issues
  members: [
      { id: "m1", user: { id: "user2", username: "Bob" }, role: "member", status: "member" }
  ],
  cycles: [],
  polls: [{ count: 1 }]
};

const mockUser = {
  id: "user2",
  email: "bob@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString()
};

test('verify poll results visual', async ({ page }) => {
  // Mock Supabase requests
  await page.route('**/rest/v1/groups?*', async route => {
    // The query checks for slug and includes nested members etc
    await route.fulfill({ json: mockGroup });
  });

  await page.route('**/rest/v1/polls?*', async route => {
    await route.fulfill({ json: mockPoll });
  });

  // Mock Auth - we need to inject the session into localStorage
  await page.addInitScript(user => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
      access_token: "fake-token",
      refresh_token: "fake-refresh-token",
      user: user,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }));
  }, mockUser);

  // Navigate to poll details page
  await page.goto('http://localhost:8080/groups/my-group/polls/quiz-time');

  // Wait for poll title to appear
  await expect(page.locator('h1').filter({ hasText: 'Quiz Time' })).toBeVisible({ timeout: 10000 });

  // Ensure results are visible
  await expect(page.locator('text=Paris')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: '/home/jules/verification/poll_results.png', fullPage: true });
});
