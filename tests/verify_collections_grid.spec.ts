import { test, expect } from '@playwright/test';

test('verify collections grid on profile', async ({ page }) => {
  const username = 'globetrotter_1968';
  await page.goto(`http://localhost:8080/profile/${username}`);
  await page.waitForLoadState('networkidle');
  const collectionsHeader = page.getByText('Collections', { exact: false });
  await expect(collectionsHeader).toBeVisible();
  await page.screenshot({ path: 'verification_collections_grid.png' });
});
