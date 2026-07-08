import { expect, type Page, test } from "@playwright/test";

// QA account (role='test_user', pre-onboarded). Locally these come from
// .env.local (loaded by playwright.config.ts); in CI from Actions secrets.
export const activeUser = {
  email: process.env.ACTIVE_USER_EMAIL ?? "",
  password: process.env.ACTIVE_USER_PASSWORD ?? "",
};

export function requireActiveUser() {
  test.skip(
    !activeUser.email || !activeUser.password,
    "ACTIVE_USER_EMAIL / ACTIVE_USER_PASSWORD not set"
  );
}

/** Pre-seed cookie consent so the bottom banner never renders mid-test. */
export async function suppressConsentBanner(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("plano-analytics-consent", "denied");
  });
}

/** UI login via /login; resolves once the app has navigated away to `/`. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
}

/**
 * Search from /search and open the first building result's full detail page.
 * Returns the building name as shown in the result list.
 */
export async function openFirstSearchResult(page: Page, query: string): Promise<string> {
  await page.goto("/search");
  const input = page.getByPlaceholder("Search buildings, people, companies...");
  await input.fill(query);
  await input.press("Enter");

  const firstResult = page.locator("h3").first();
  await expect(firstResult).toBeVisible({ timeout: 30_000 });
  const name = (await firstResult.textContent())?.trim() ?? "";

  // Plain click opens the in-place detail drawer (role=dialog named after the
  // building)…
  await firstResult.click();
  const drawer = page.getByRole("dialog", { name });
  await expect(drawer).toBeVisible();
  // …and its "Open full profile" link points at /building/:id. Navigate via
  // href rather than clicking: the map continuously rewrites the /search URL
  // params, which makes click-navigation racy.
  const href = await drawer
    .getByRole("link", { name: "Open full profile" })
    .getAttribute("href");
  if (!href) throw new Error("drawer has no 'Open full profile' href");
  await page.goto(href);
  // /building/:id redirects to the canonical /architecture/:country/:city/:id/:slug.
  await page.waitForURL(/\/(building|architecture)\//);
  return name;
}
