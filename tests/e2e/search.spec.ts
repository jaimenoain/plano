import { test, expect } from "@playwright/test";
import { suppressConsentBanner } from "./helpers";

// Critical path 2: anonymous search — the core discovery flow works without login.
test.describe("search", () => {
  test.beforeEach(async ({ page }) => {
    await suppressConsentBanner(page);
  });

  test("finds buildings and opens the detail drawer", async ({ page }) => {
    await page.goto("/search");

    const input = page.getByPlaceholder("Search buildings, people, companies...");
    await input.fill("museum");
    await input.press("Enter");

    const firstResult = page.locator("h3").first();
    await expect(firstResult).toBeVisible({ timeout: 30_000 });

    const name = (await firstResult.textContent())?.trim() ?? "";
    await firstResult.click();
    const drawer = page.getByRole("dialog", { name });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Open full profile" })).toBeVisible();
  });
});
