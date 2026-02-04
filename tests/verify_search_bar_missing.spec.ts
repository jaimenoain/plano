import { test, expect } from '@playwright/test';

test.describe('Search Page Search Bar', () => {
  test('should be visible on desktop search page', async ({ page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('http://localhost:8080/search');

    // Verify desktop grid is visible
    const desktopContainer = page.locator('.md\\:grid');
    await expect(desktopContainer).toBeVisible();

    // Check if input is inside desktop container
    const inputInDesktop = desktopContainer.locator('input[placeholder*="Search buildings"]');

    await expect(inputInDesktop).toBeVisible();

    await inputInDesktop.fill('test search');
    await expect(inputInDesktop).toHaveValue('test search');
  });

  test('should be visible on mobile search page', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:8080/search');

    // On mobile, the desktop grid should be hidden
    const desktopContainer = page.locator('.md\\:grid');
    await expect(desktopContainer).toBeHidden();

    // The search bar should be in the Header
    // We target the input inside the header
    const searchInput = page.locator('header input[placeholder*="Search buildings"]');

    await expect(searchInput).toBeVisible();

    await searchInput.fill('mobile search');
    await expect(searchInput).toHaveValue('mobile search');
  });
});
