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

  // An architect's name is how people remember buildings. Before migration
  // 20271192000000 `buildings.search_vector` held no credits, so this query
  // returned one trigram neighbour ("Hanaha") and none of Zaha Hadid's work.
  test("finds a building by its architect", async ({ page }) => {
    await page.goto("/search");

    const input = page.getByPlaceholder("Search buildings, people, companies...");
    await input.fill("Zaha Hadid");
    await input.press("Enter");

    // A SERP row is a link wrapping the name (h3) and the credit line, so a row
    // carrying her name is a building the search reached through its credits —
    // no building in Plano is named "Zaha Hadid".
    const creditedRow = page
      .locator("a:has(h3)")
      .filter({ hasText: /Zaha Hadid/i })
      .first();
    await expect(creditedRow).toBeVisible({ timeout: 30_000 });
  });
});
