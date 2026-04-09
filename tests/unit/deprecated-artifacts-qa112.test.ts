import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * QA 11.2 — mirrors roadmap greps under `src/` and `app/` (TypeScript only).
 * Legacy `/architect/` lines are allowed when the same line mentions redirect handling
 * or LAUNCH_HOSTING (see roadmap `grep -v "redirect\|LAUNCH_HOSTING"`).
 */

function walkTsFiles(dir: string, out: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkTsFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const LEGACY_TABLE_REF =
  /building_architects|"architects"|`architects`|from architects|\.architects\b/;

const DEPRECATED_COMPONENTS_A =
  /ArchitectSelect|ClaimProfileDialog|ArchitectPortfolio|useArchitectPortfolio/;

const DEPRECATED_COMPONENTS_B =
  /ArchitectDashboard(?!Redirect)|FeaturedArchitect|DisconnectArchitectDialog/;

const ARCHITECT_DETAILS = /ArchitectDetails/;

/** Route table lines split `path=` / `route(` / string literal from `Redirect` on another line (roadmap allows redirect wiring). */
function isLegacyArchitectRouteDeclaration(line: string): boolean {
  const s = line.trimStart();
  return (
    s.startsWith(`path="/architect/`) ||
    s.startsWith(`route("/architect/`) ||
    s.startsWith(`"/architect/`)
  );
}

describe("QA 11.2 — deprecated artifacts (src/ + app/)", () => {
  const root = process.cwd();
  const files = [
    ...walkTsFiles(join(root, "src")),
    ...walkTsFiles(join(root, "app")),
  ];

  it("has no legacy architects / building_architects table references", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (LEGACY_TABLE_REF.test(text)) {
        hits.push(`${file}: legacy table pattern`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("has no deprecated architect-era component identifiers (batch A)", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (DEPRECATED_COMPONENTS_A.test(text)) {
        hits.push(`${file}: ${DEPRECATED_COMPONENTS_A.source}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("has no deprecated architect-era component identifiers (batch B)", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (DEPRECATED_COMPONENTS_B.test(text)) {
        hits.push(`${file}: ${DEPRECATED_COMPONENTS_B.source}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("has no ArchitectDetails symbol references", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (ARCHITECT_DETAILS.test(text)) {
        hits.push(`${file}: ArchitectDetails`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("has no /architect/ path literals except on redirect/LAUNCH_HOSTING lines", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!line.includes("/architect/")) return;
        if (/redirect|LAUNCH_HOSTING/i.test(line)) return;
        if (isLegacyArchitectRouteDeclaration(line)) return;
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("has no @deprecated JSDoc or comments in app source", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (text.includes("@deprecated")) {
        hits.push(file);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
