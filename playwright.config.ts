import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// E2E runs against the production Supabase project using dedicated QA accounts
// (role='test_user'). Locally the credentials come from .env.local; in CI from
// GitHub Actions secrets. Zero-dep .env.local loader — never overrides values
// already present in the environment.
try {
  for (const line of readFileSync(new URL(".env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
} catch {
  // no .env.local (CI) — env comes from secrets
}

export default defineConfig({
  testDir: "tests/e2e",
  // Specs share QA accounts; run serially so saves/unsaves don't race.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    // vite.config.ts pins the dev server to port 8080.
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
