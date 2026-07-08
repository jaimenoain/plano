import { test, expect } from "@playwright/test";
import { activeUser, login, requireActiveUser, suppressConsentBanner } from "./helpers";

// Critical path 1: a returning user can sign in and lands on the feed.
test.describe("auth", () => {
  test.beforeEach(async ({ page }) => {
    requireActiveUser();
    await suppressConsentBanner(page);
  });

  test("signs in with email and password", async ({ page }) => {
    await login(page, activeUser.email, activeUser.password);

    await expect(page).toHaveURL("/");
    // @supabase/ssr persists the session as sb-*-auth-token cookies.
    const cookies = await page.context().cookies();
    expect(
      cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
    ).toBe(true);
  });

  test("rejects a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(activeUser.email);
    await page.locator("#password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(page.getByText("Sign in failed").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
