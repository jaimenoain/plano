import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * QA 11.5 — automated slice: settings no longer mounts `DisconnectArchitectDialog`;
 * legacy disconnect uses `DisconnectLegacyClaimDialog`. Profile page exposes professional
 * profile copy for claimed-person UX. Manual UAT: sign-in flows, settings, multi-user nav.
 */

describe("QA 11.5 — profile / settings sources (automated)", () => {
  const root = process.cwd();

  it("Settings uses DisconnectLegacyClaimDialog, not DisconnectArchitectDialog", () => {
    const path = join(root, "src/features/profile/pages/Settings.tsx");
    const src = readFileSync(path, "utf8");
    expect(src).toContain("DisconnectLegacyClaimDialog");
    expect(src).not.toContain("DisconnectArchitectDialog");
  });

  it("Profile page source includes Professional profile section copy", () => {
    const path = join(root, "src/features/profile/pages/Profile.tsx");
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/Professional profile/i);
  });
});
