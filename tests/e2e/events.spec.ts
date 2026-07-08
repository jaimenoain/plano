import { test, expect } from "@playwright/test";
import { suppressConsentBanner } from "./helpers";

// Critical path 5: the community read path — the events calendar loads.
test.describe("events", () => {
  test.beforeEach(async ({ page }) => {
    await suppressConsentBanner(page);
  });

  test("events page loads without a data error", async ({ page }) => {
    await page.goto("/events");

    await expect(
      page.getByRole("heading", { level: 1, name: "Upcoming events" })
    ).toBeVisible();
    // Either real events or the friendly empty state — but never the error state.
    await expect(
      page.getByText("Events could not be loaded. Please try again later.")
    ).toHaveCount(0);
  });
});
