import { test, expect } from '@playwright/test';

test.describe('Sidebar and header layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('sidebar and header align and toggle correctly on desktop, including Feed page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const sidebar = page.locator('[data-sidebar="sidebar"]');
    const header = page.locator('header[role="banner"], header');

    await expect(sidebar).toBeVisible();
    await expect(header.first()).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const headerBox = await header.first().boundingBox();

    expect(sidebarBox).not.toBeNull();
    expect(headerBox).not.toBeNull();

    if (sidebarBox && headerBox) {
      expect(headerBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 1);
    }

    const trigger = page.getByLabel(/toggle sidebar/i);
    await trigger.click();

    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    const firstNavItem = page.getByRole('link', { name: /explore/i }).first();
    await firstNavItem.click();

    await trigger.click();
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await page.goto('/');

    const feedHeaderBox = await header.first().boundingBox();
    const feedSidebarBox = await sidebar.boundingBox();

    expect(feedHeaderBox).not.toBeNull();
    expect(feedSidebarBox).not.toBeNull();

    if (feedHeaderBox && feedSidebarBox) {
      expect(feedHeaderBox.x).toBeGreaterThanOrEqual(feedSidebarBox.x + feedSidebarBox.width - 1);
    }
  });
});

