import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("QA 8.2 — no legacy ArchitectClaims route", () => {
  it("app/routes.ts maps admin claims to EntityClaims page", () => {
    const routes = readFileSync(join(repoRoot, "app/routes.ts"), "utf8");
    expect(routes).toContain("/admin/claims");
    expect(routes).toContain("EntityClaims.tsx");
    expect(routes).not.toContain("ArchitectClaims");
  });
});
