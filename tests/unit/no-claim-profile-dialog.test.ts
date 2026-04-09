import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(fileURLToPath(new URL(import.meta.url)), "../..");
const NEEDLE = "ClaimProfileDialog";

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".react-router",
  "coverage",
]);

function walkSourceFiles(dir: string, acc: string[]): void {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      walkSourceFiles(p, acc);
    } else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
      acc.push(p);
    }
  }
}

describe("QA 7.1 — legacy ClaimProfileDialog absent from src/ and app/", () => {
  it("no source file under src/ or app/ references ClaimProfileDialog", () => {
    const files: string[] = [];
    walkSourceFiles(join(REPO_ROOT, "src"), files);
    walkSourceFiles(join(REPO_ROOT, "app"), files);

    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf-8");
      if (text.includes(NEEDLE)) hits.push(f);
    }

    expect(hits, `Remove or rename references; found in:\n${hits.join("\n")}`).toEqual([]);
  });
});
