import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards the two dependency rules that decide whether the notification emails run at all.
 * Both failures are invisible to every other check in this repo: they are Deno-runtime
 * faults in code CI never executes, and the first one produces no function logs — only
 * edge 500s — so nothing surfaces until a user does not get an email.
 *
 * 1. The `@react-email/components` barrel side-effect-imports `@react-email/render`, which
 *    pulls in `prettier`, which throws at module load under Deno. That kills the edge
 *    function at BOOT with a 500 WORKER_ERROR before a single request is served. Every
 *    template imported the barrel until this was found; templates must go through
 *    _shared/emails/reactEmail.ts instead.
 * 2. Each pinned subpackage needs `?deps=react@18.3.1`, or esm.sh gives it its own React
 *    copy and elements cross instances — React error #31 at send time.
 *
 * `scripts/check-email-edge-functions.tsx` proves the same properties by actually booting
 * the modules under Deno; this test is the cheap version that runs in CI, which has no Deno.
 */

const repoRoot = resolve(__dirname, "../..");
const emailsDir = resolve(repoRoot, "supabase/functions/_shared/emails");
const read = (p: string) => readFileSync(p, "utf8");

// Matches only a real import/export specifier, so the prose in the rationale comments
// (which necessarily names the barrel) cannot trip the guard.
const BARREL_SPECIFIER = /from\s+['"]https:\/\/esm\.sh\/@react-email\/components/;

const templateFiles = readdirSync(emailsDir).filter((f) => f.endsWith(".tsx"));

describe("edge email templates", () => {
  it("has templates to check", () => {
    expect(templateFiles.length).toBeGreaterThan(0);
  });

  it.each(templateFiles)("%s does not import the react-email barrel", (file) => {
    expect(read(resolve(emailsDir, file))).not.toMatch(BARREL_SPECIFIER);
  });

  it.each(templateFiles)("%s sources its components from reactEmail.ts", (file) => {
    const source = read(resolve(emailsDir, file));
    // Every template renders markup, so every template needs components from somewhere.
    expect(source).toMatch(/from\s+['"]\.\/reactEmail\.ts['"]/);
  });
});

describe("_shared/emails/reactEmail.ts", () => {
  const source = read(resolve(emailsDir, "reactEmail.ts"));

  it("does not import the react-email barrel", () => {
    expect(source).not.toMatch(BARREL_SPECIFIER);
  });

  it("pins ?deps=react on every react-email subpackage it re-exports", () => {
    const specifiers = [...source.matchAll(/https:\/\/esm\.sh\/@react-email\/[^'"]+/g)].map(
      (m) => m[0]
    );
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(specifier).toContain("?deps=react@18.3.1");
    }
  });
});

/**
 * Handing Resend a React element via `react:` makes it render with its OWN bundled
 * @react-email/render, whose React copy we do not control. Functions must render to HTML
 * themselves and send `html:`.
 */
describe("edge functions that send templated email", () => {
  const functionsDir = resolve(repoRoot, "supabase/functions");
  const consumers = readdirSync(functionsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "_shared")
    .map((e) => resolve(functionsDir, e.name, "index.ts"))
    .filter((p) => {
      try {
        return read(p).includes("_shared/emails/");
      } catch {
        return false;
      }
    });

  it("finds the template consumers", () => {
    expect(consumers.length).toBeGreaterThan(0);
  });

  it.each(consumers.map((p) => [p.split("/").slice(-2)[0], p]))(
    "%s renders to html instead of passing react: to Resend",
    (_name, path) => {
      const source = read(path as string);
      expect(source).not.toMatch(/^\s*react:\s/m);
      expect(source).toMatch(
        /from\s+['"]https:\/\/esm\.sh\/@react-email\/render@[^'"]*\?deps=react@18\.3\.1/
      );
    }
  );
});
