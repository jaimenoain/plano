#!/usr/bin/env node
/**
 * gen-types staleness check — zero-dependency, BLOCKING.
 *
 * If a PR adds/changes files under supabase/migrations/ but leaves
 * src/integrations/supabase/types.ts untouched, the generated types are probably now stale: a
 * schema migration must be accompanied by a `npm run gen-types` regen committed in the same PR
 * (see docs/migrations.md).
 *
 * This NEVER contacts Supabase (no token needed). It exits non-zero on the stale condition and
 * gates the build via the "Types staleness" CI job. Requires a full-depth checkout on PRs so the
 * origin/$GITHUB_BASE_REF diff works.
 *
 * Usage: `node scripts/check-types-staleness.mjs`
 */

import { execSync } from "node:child_process";

const TYPES_PATH = "src/integrations/supabase/types.ts";

function changedFiles() {
  const tryCmd = (cmd) => {
    try {
      return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return null;
    }
  };

  const baseRef = process.env.GITHUB_BASE_REF;
  let files = null;
  if (baseRef) {
    files =
      tryCmd(`git diff --name-only origin/${baseRef}...HEAD`) ??
      tryCmd(`git diff --name-only ${baseRef}...HEAD`);
  }
  if (!files) files = tryCmd("git diff --name-only HEAD");
  return files ?? [];
}

function main() {
  const files = changedFiles();
  if (files.length === 0) {
    console.log("✓ types-staleness: no diff context available; nothing to check.");
    return;
  }

  const migrationChanged = files.some(
    (f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql")
  );
  const typesChanged = files.includes(TYPES_PATH);

  if (migrationChanged && !typesChanged) {
    console.error(
      "✗ Types staleness: this change touches supabase/migrations/ but does not update " +
        `${TYPES_PATH}.\n` +
        "  Run `npm run gen-types` locally and commit the regenerated types in this PR.\n" +
        "  See docs/migrations.md. Resolve the item; do not weaken or skip this check."
    );
    process.exit(1);
  }

  console.log("✓ types-staleness: ok.");
}

main();
