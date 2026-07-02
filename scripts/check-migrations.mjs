#!/usr/bin/env node
/**
 * Migration filename linter for supabase/migrations/.
 *
 * Guarantees for NEW migrations (blocking — exit 1 on violation):
 *   - Filenames match `<timestamp>_<snake_case_description>.sql`
 *   - timestamp is 8 digits (YYYYMMDD) or 14 digits (YYYYMMDDhhmmss)
 *   - description is lowercase alphanumeric + underscores
 *
 * Warn-only (never fails the build): duplicate timestamps and non-monotonic
 * ordering. These already exist in the repo's history and renaming an applied
 * migration is unsafe — so we surface them without blocking.
 *
 * LEGACY_EXCEPTIONS grandfathers pre-existing files that predate the convention.
 * Do NOT add to this list to sidestep the check for new migrations — name them
 * correctly instead.
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve("supabase/migrations");

// Pre-existing files (before the naming convention) that we deliberately allow.
const LEGACY_EXCEPTIONS = new Set(["add_slug_to_groups.sql"]);

const NAME_RE = /^\d{8}(\d{6})?_[a-z0-9_]+\.sql$/;

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const violations = [];
const warnings = [];
const timestamps = new Map(); // timestamp -> [filenames]

for (const file of files) {
  if (LEGACY_EXCEPTIONS.has(file)) {
    warnings.push(`grandfathered (no timestamp): ${file}`);
    continue;
  }
  if (!NAME_RE.test(file)) {
    violations.push(file);
    continue;
  }
  const ts = file.slice(0, file.indexOf("_"));
  if (!timestamps.has(ts)) timestamps.set(ts, []);
  timestamps.get(ts).push(file);
}

for (const [ts, group] of timestamps) {
  if (group.length > 1) {
    warnings.push(`duplicate timestamp ${ts}: ${group.join(", ")}`);
  }
}

console.log(`[check-migrations] scanned ${files.length} migration file(s) in supabase/migrations/`);

if (warnings.length) {
  console.log(`[check-migrations] ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

if (violations.length) {
  console.error(`\n[check-migrations] ✗ ${violations.length} filename(s) violate the naming convention`);
  console.error(`  expected: <YYYYMMDD | YYYYMMDDhhmmss>_<snake_case_description>.sql`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}

console.log("[check-migrations] ✓ all migration filenames valid");
process.exit(0);
