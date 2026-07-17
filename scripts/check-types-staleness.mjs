#!/usr/bin/env node
/**
 * gen-types staleness check — zero-dependency, BLOCKING.
 *
 * If a PR adds/changes files under supabase/migrations/ but leaves
 * src/integrations/supabase/types.ts untouched, the generated types are probably now stale: a
 * schema migration must be accompanied by a `npm run gen-types` regen committed in the same PR
 * (see docs/migrations.md).
 *
 * Escape hatch for genuinely types-neutral migrations (e.g. a `create or replace function` that
 * only changes a function BODY — an ORDER BY tweak, a reworded RAISE — with no change to its
 * signature/return type, or a data backfill): a migration may declare itself with a
 * `-- types-neutral: <reason>` marker line. Such a migration no longer requires a types.ts diff.
 * This is NOT a blanket skip — every changed migration must either update types.ts or carry the
 * marker, so any un-marked migration (a real schema change) still fails the check. The marker and
 * its reason live in the migration file, so the exemption is auditable in the PR diff.
 *
 * This NEVER contacts Supabase (no token needed). It exits non-zero on the stale condition and
 * gates the build via the "Types staleness" CI job. Requires a full-depth checkout on PRs so the
 * origin/$GITHUB_BASE_REF diff works.
 *
 * Usage: `node scripts/check-types-staleness.mjs`
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TYPES_PATH = "src/integrations/supabase/types.ts";

/** Marker that exempts a types-neutral migration; requires a non-empty reason. */
const TYPES_NEUTRAL_MARKER = /^\s*--\s*types-neutral:\s*\S.*$/im;

function isTypesNeutral(file) {
  try {
    return TYPES_NEUTRAL_MARKER.test(readFileSync(file, "utf8"));
  } catch {
    // Unreadable (e.g. a deleted migration): can't confirm it's neutral, so treat it as requiring
    // a types regen — the conservative default.
    return false;
  }
}

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

  const migrationFiles = files.filter(
    (f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql")
  );
  const typesChanged = files.includes(TYPES_PATH);

  // A types.ts diff satisfies the check for the whole PR (a real regen happened).
  if (migrationFiles.length > 0 && !typesChanged) {
    // Otherwise every changed migration must declare itself types-neutral.
    const unexempt = migrationFiles.filter((f) => !isTypesNeutral(f));
    if (unexempt.length > 0) {
      console.error(
        "✗ Types staleness: this change touches supabase/migrations/ but does not update " +
          `${TYPES_PATH}.\n` +
          "  Run `npm run gen-types` locally and commit the regenerated types in this PR.\n" +
          "  If a migration genuinely changes no types (e.g. a function-body-only " +
          "`create or replace`), add a `-- types-neutral: <reason>` line to it.\n" +
          "  Migrations needing one of the two:\n" +
          unexempt.map((f) => `    - ${f}`).join("\n") +
          "\n  See docs/migrations.md. Resolve the item; do not weaken or skip this check."
      );
      process.exit(1);
    }
    console.log(
      `✓ types-staleness: ok (${migrationFiles.length} migration(s) declared types-neutral).`
    );
    return;
  }

  console.log("✓ types-staleness: ok.");
}

main();
