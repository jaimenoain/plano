import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function walkForFilenamePredicate(
  dir: string,
  matches: (filename: string) => boolean,
  acc: string[],
): void {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === "coverage") continue;
      walkForFilenamePredicate(p, matches, acc);
    } else if (matches(e.name)) {
      acc.push(p);
    }
  }
}

describe("QA 10.1 — deprecated architect search artifacts", () => {
  it("has no ArchitectSelect* files under src/ or app/", () => {
    const hits: string[] = [];
    for (const root of ["src", "app"]) {
      const abs = join(repoRoot, root);
      walkForFilenamePredicate(abs, (name) => name.startsWith("ArchitectSelect"), hits);
    }
    expect(hits).toEqual([]);
  });

  it("does not define a FeaturedArchitect component module under src/", () => {
    const hits: string[] = [];
    walkForFilenamePredicate(join(repoRoot, "src"), (name) => name.startsWith("FeaturedArchitect"), hits);
    expect(hits).toEqual([]);
  });
});
