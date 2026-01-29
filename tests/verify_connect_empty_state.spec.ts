import { test, expect } from '@playwright/test';

test('verify connect empty state for user with no groups', async ({ page }) => {
  // Mock User Session
  await page.addInitScript(() => {
    const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQifQ.signature";
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: fakeJwt,
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

  // Mock Auth User
  await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: "user-uuid",
              email: "test@example.com",
              role: "authenticated",
              aud: "authenticated"
          })
      });
  });

  // Mock get_user_groups_summary RPC
  await page.route('**/rest/v1/rpc/get_user_groups_summary', async route => {
      const postData = route.request().postDataJSON();

      if (postData.p_type === 'my') {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([]) // No groups for user
          });
      } else if (postData.p_type === 'public') {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  {
                      id: 'public-group-1',
                      slug: 'public-group-1',
                      name: 'Public Group 1',
                      description: 'A public group',
                      is_public: true,
                      member_count: 10,
                      recent_posters: [],
                      member_avatars: []
                  }
              ])
          });
      } else {
          await route.continue();
      }
  });

  // Log page console output
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:8080/groups');

  // Wait for loading to finish by waiting for the "Create First Group" button
  // which appears in the empty state.
  await expect(page.getByRole('button', { name: 'Create First Group' })).toBeVisible({ timeout: 10000 });

  // Now that content is loaded, verify Tabs are HIDDEN (This should fail in current implementation)
  await expect(page.getByRole('tab', { name: 'My Groups' })).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Browse Public' })).toBeHidden();

  // Verify "or browse public" link/button is visible
  // We'll look for a specific button or link to avoid matching paragraph text
  const browseLink = page.getByRole('button', { name: 'or browse public' });
  await expect(browseLink).toBeVisible();

  await page.screenshot({ path: 'verification_empty_state.png' });

  // Click "or browse public"
  await browseLink.click();

  // Verify Tabs appear
  await expect(page.getByRole('tab', { name: 'My Groups' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Browse Public' })).toBeVisible();

  // Verify "Browse Public" tab is active (selected)
  const browseTab = page.getByRole('tab', { name: 'Browse Public' });
  await expect(browseTab).toHaveAttribute('data-state', 'active');

  // Verify public group is shown
  await expect(page.getByText('Public Group 1')).toBeVisible();

  await page.screenshot({ path: 'verification_tabs_visible.png' });
});
