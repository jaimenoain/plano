import { test, expect } from "@playwright/test";
import { openFirstSearchResult, suppressConsentBanner } from "./helpers";

// Critical path 3: the building detail page (the core content page) renders.
test.describe("building detail", () => {
  test.beforeEach(async ({ page }) => {
    await suppressConsentBanner(page);
  });

  test("renders a building page reached from search", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    const name = await openFirstSearchResult(page, "museum");

    // h1 renders "<name>." with a trailing period — match on the name substring.
    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible();
    expect((await heading.textContent()) ?? "").toContain(name);

    expect(errors, `client-side errors: ${errors.join("; ")}`).toEqual([]);
  });
});
