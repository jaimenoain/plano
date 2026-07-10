// Visual design-audit tool for the precision-refinement programme
// (docs/DESIGN_PRECISION_SPEC.md).
//
// Logs in as the ACTIVE test user, forces the tab to report *visible* (so
// framer-motion entrance animations settle — otherwise logged-in screens
// screenshot blank), then screenshots the given routes at desktop (1440) and/or
// mobile (390) and prints a horizontal-overflow + <h1> readout per route.
//
// Creds are read from .env.local IN-PROCESS and never printed.
//
// Prereqs: dev server running (`npm run dev`, default port 8080) and chromium
//   (`npx playwright install chromium`).
//
// Usage:
//   node scripts/design-audit.mjs --routes /,/explore,/search
//   node scripts/design-audit.mjs --routes /profile --viewport m --out .audit
//   node scripts/design-audit.mjs --routes /building/13154 --base http://localhost:8085
//
// Output: PNGs at <out>/<slug>-<d|m>.png (default out: .audit, gitignored).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const BASE = arg("base", "http://localhost:8080").replace(/\/$/, "");
const OUT = arg("out", ".audit");
const ROUTES = arg("routes", "/").split(",").map((r) => r.trim()).filter(Boolean);
const VP = arg("viewport", "both"); // d | m | both

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
if (!env.ACTIVE_USER_EMAIL || !env.ACTIVE_USER_PASSWORD) {
  console.error("ACTIVE_USER_EMAIL / ACTIVE_USER_PASSWORD missing from .env.local");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const slug = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-+$/g, ""));

const targets = VP === "d" ? [["d", { width: 1440, height: 900 }]]
  : VP === "m" ? [["m", { ...devices["iPhone 13"].viewport }]]
  : [["d", { width: 1440, height: 900 }], ["m", { width: 390, height: 844 }]];

for (const [tag, viewport] of targets) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: tag === "m", hasTouch: tag === "m" });
  // Make framer-motion animations settle (the app hides content until they play).
  await ctx.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "visible" });
    Object.defineProperty(document, "hidden", { get: () => false });
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(env.ACTIVE_USER_EMAIL);
  await page.locator("#password").fill(env.ACTIVE_USER_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);
  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 25000 });
    } catch { /* capture whatever rendered */ }
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: document.querySelector("h1")?.textContent?.trim()?.slice(0, 40) ?? null,
    }));
    writeFileSync(`${OUT}/${slug(route)}-${tag}.png`, await page.screenshot({ fullPage: false }));
    console.error(`  ${tag} ${route} → h1:${JSON.stringify(m.h1)} h-overflow:${m.overflow}px`);
  }
  await browser.close();
}
console.error(`DONE → ${OUT}`);
