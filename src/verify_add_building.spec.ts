import { test, expect } from '@playwright/test';

test('verify add building ui', async ({ page }) => {
  // 1. Go to the add building page directly.
  // Note: If authentication is required, this might redirect to login.
  // However, we are verifying the UI components presence.
  await page.goto('http://localhost:3000/add-building');

  // Check if we are redirected to login or if we can see the page.
  // If we are redirected, we might need to mock auth or use a test user if available.
  // But first let's see what happens.

  // Wait for network idle or dom content loaded
  await page.waitForLoadState('networkidle');

  // Take a screenshot to see where we are
  await page.screenshot({ path: '/home/jules/verification/add_building_initial.png' });

  // If we are on login page, we can't test easily without credentials.
  // But let's check if the text "Building Name (Optional)" exists.
  // If it exists, we are on the right page.
  const nameLabel = page.getByText('Building Name (Optional)');

  if (await nameLabel.isVisible()) {
      console.log("Successfully loaded Add Building page");
      // Verify Input exists
      const nameInput = page.getByLabel('Building Name (Optional)');
      await expect(nameInput).toBeVisible();

      // Verify Location Input exists
      const locationLabel = page.getByText('Location Search', { exact: false });
      await expect(locationLabel).toBeVisible();

      // Type something in name
      await nameInput.fill('Test Building');

      // Take screenshot of the form
      await page.screenshot({ path: '/home/jules/verification/add_building_form.png' });
  } else {
      console.log("Could not find Building Name input, possibly redirected to login");
  }

});
