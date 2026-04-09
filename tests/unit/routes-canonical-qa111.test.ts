import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

describe("QA 11.1 — canonical routes in app/routes.ts", () => {
  const appRoutesPath = join(repoRoot, "app", "routes.ts");
  const srcRoutesPath = join(repoRoot, "src", "routes.ts");

  const appRoutesSource = readFileSync(appRoutesPath, "utf8");
  const srcRoutesSource = readFileSync(srcRoutesPath, "utf8");

  it("defines required person, company, and token routes in app/routes.ts", () => {
    expect(appRoutesSource).toMatch(/route\s*\(\s*["']\/person\/:slug["']/);
    expect(appRoutesSource).toMatch(/route\s*\(\s*["']\/company\/:slug["']\s*,/);
    expect(appRoutesSource).toContain('"/remove-credit/:token"');
    expect(appRoutesSource).toContain('"/verify-company-claim/:token"');
    expect(appRoutesSource).toContain('"/approve-steward-request/:token"');
  });

  it("defines legacy /architect/:id redirect in app/routes (not only in src/routes.ts)", () => {
    expect(appRoutesSource).toContain('route("/architect/:id"');
    expect(appRoutesSource).toContain("ArchitectIdRedirect");
  });

  it("keeps src/routes.ts as a re-export shim without inline route() definitions", () => {
    expect(srcRoutesSource).toMatch(/from\s+["']\.\.\/app\/routes["']/);
    expect(srcRoutesSource).not.toMatch(/\broute\s*\(/);
    expect(srcRoutesSource).not.toContain("/person/:slug");
    expect(srcRoutesSource).not.toContain("/company/:slug");
    expect(srcRoutesSource).not.toContain("/remove-credit/");
    expect(srcRoutesSource).not.toContain("/verify-company-claim/");
    expect(srcRoutesSource).not.toContain("/approve-steward-request/");
  });
});
