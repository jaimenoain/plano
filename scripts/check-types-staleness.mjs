#!/usr/bin/env node
/**
 * gen-types staleness reminder (Phase 1, Theme C) — zero-dependency, ADVISORY.
 *
 * If a PR adds/changes files under supabase/migrations/ but leaves
 * src/integrations/supabase/types.ts untouched, the generated types are probably now stale: a
 * schema migration should be accompanied by a `npm run gen-types` regen committed in the same PR
 * (see docs/migrations.md).
 *
 * This NEVER contacts Supabase (no token needed) and is wired into CI with `continue-on-error:
 * true`, so it only ever prints a reminder — it does not gate the build. It exits non-zero when it
 * detects the stale condition so the CI step renders a visible (non-failing) signal.
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
    console.warn(
      "⚠ This change touches supabase/migrations/ but does not update " +
        `${TYPES_PATH}.\n` +
        "  If the migration changed the public schema, run `npm run gen-types` locally and commit\n" +
        "  the regenerated types in this PR. See docs/migrations.md. (advisory — not blocking)"
    );
    process.exit(1);
  }

  console.log("✓ types-staleness: ok.");
}

main();
