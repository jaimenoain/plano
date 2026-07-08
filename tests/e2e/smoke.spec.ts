import { test, expect } from "@playwright/test";

// Harness smoke test: the SSR app boots, serves the home page, and hydrates
// without a client-side crash.
test("home page renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(page).toHaveTitle(/plano/i);

  expect(errors, `client-side errors: ${errors.join("; ")}`).toEqual([]);
});
