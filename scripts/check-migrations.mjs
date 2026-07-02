#!/usr/bin/env node
/**
 * Migration guardrail (Phase 1, Theme E) — zero-dependency, Node built-ins only.
 *
 * What it does, and what it deliberately does NOT do:
 *   - HARD FAIL (exit 1) on a NEW timestamp collision: two migrations sharing the same
 *     14-digit YYYYMMDDHHmmss prefix where that prefix is not in the baseline. The Supabase
 *     tracker silently applies one file per timestamp and skips the rest — the documented root
 *     cause of several production incidents.
 *   - HARD FAIL on a NEW non-conforming filename (not YYYYMMDDHHmmss_desc.sql and not baselined).
 *   - WARN ONLY (never fails) on soft SQL sanity issues in *changed* files: empty file,
 *     unbalanced `$$` dollar-quotes, or a `create ... function` with no `revoke ... from public`
 *     (the RPC grant-discipline nudge). These are best-effort hints, not a gate.
 *
 * The 33 colliding prefixes + 2 non-conforming names that are already applied to production are
 * listed in `.collision-baseline.json` and are accepted as-is — renaming live migrations would
 * make Supabase replay them. So this script is GREEN on the current tree and only catches what is
 * newly introduced.
 *
 * Usage: `node scripts/check-migrations.mjs`
 */

import { readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const baselinePath = join(migrationsDir, ".collision-baseline.json");

const TIMESTAMP_RE = /^(\d{14})_.+\.sql$/;

function loadBaseline() {
  try {
    const raw = JSON.parse(readFileSync(baselinePath, "utf8"));
    return {
      allowedDuplicatePrefixes: new Set(raw.allowedDuplicatePrefixes ?? []),
      allowedNonTimestamped: new Set(raw.allowedNonTimestamped ?? []),
    };
  } catch (err) {
    console.error(`✖ Could not read baseline at ${baselinePath}: ${err.message}`);
    process.exit(1);
  }
}

/** Best-effort: list migration files changed in this PR / staged commit. Empty array on failure. */
function changedMigrationFiles() {
  const tryCmd = (cmd) => {
    try {
      return execSync(cmd, { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return null;
    }
  };

  let files = null;
  // PR context (GitHub Actions sets GITHUB_BASE_REF on pull_request events).
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    files =
      tryCmd(`git diff --name-only origin/${baseRef}...HEAD`) ??
      tryCmd(`git diff --name-only ${baseRef}...HEAD`);
  }
  // Pre-commit / local fallbacks.
  if (!files) files = tryCmd("git diff --name-only --cached");
  if (!files || files.length === 0) files = tryCmd("git diff --name-only HEAD") ?? [];

  return files
    .filter((f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql"))
    .map((f) => f.replace(/^supabase\/migrations\//, ""));
}

function softSanity(name) {
  const warnings = [];
  let sql;
  try {
    sql = readFileSync(join(migrationsDir, name), "utf8");
  } catch {
    return warnings; // file was deleted/renamed in the diff — nothing to check
  }

  if (sql.trim().length === 0) {
    warnings.push("file is empty");
    return warnings;
  }
  // `$$` dollar-quote delimiters should come in pairs.
  const dollarPairs = (sql.match(/\$\$/g) ?? []).length;
  if (dollarPairs % 2 !== 0) {
    warnings.push(`unbalanced $$ dollar-quotes (${dollarPairs} occurrences)`);
  }
  // RPC grant discipline: a function definition should re-assert grants.
  if (/create\s+(or\s+replace\s+)?function/i.test(sql) && !/revoke[\s\S]*?from\s+public/i.test(sql)) {
    warnings.push(
      "defines a function but has no `revoke ... from public` — see supabase/migrations/_TEMPLATE_rpc.sql.txt"
    );
  }
  return warnings;
}

function main() {
  const baseline = loadBaseline();

  let files;
  try {
    files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  } catch (err) {
    console.error(`✖ Could not read migrations dir at ${migrationsDir}: ${err.message}`);
    process.exit(1);
  }

  const errors = [];

  // 1. Non-conforming filenames.
  const conforming = [];
  for (const name of files) {
    const m = name.match(TIMESTAMP_RE);
    if (m) {
      conforming.push({ name, prefix: m[1] });
    } else if (!baseline.allowedNonTimestamped.has(name)) {
      errors.push(
        `New non-conforming migration "${name}". Use the YYYYMMDDHHmmss_description.sql format.`
      );
    }
  }

  // 2. Timestamp collisions.
  const byPrefix = new Map();
  for (const { name, prefix } of conforming) {
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(name);
  }
  for (const [prefix, group] of byPrefix) {
    if (group.length > 1 && !baseline.allowedDuplicatePrefixes.has(prefix)) {
      errors.push(
        `New timestamp collision on prefix ${prefix}:\n    - ${group.join(
          "\n    - "
        )}\n  Bump one of these to a unique timestamp.`
      );
    }
  }

  // 3. Soft sanity (warn-only) on changed files.
  const changed = changedMigrationFiles();
  const warnings = [];
  for (const name of changed) {
    for (const w of softSanity(name)) warnings.push(`${name}: ${w}`);
  }

  if (warnings.length > 0) {
    console.warn("⚠ Migration sanity warnings (advisory — not blocking):");
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (errors.length > 0) {
    console.error("\n✖ Migration check failed:\n");
    for (const e of errors) console.error(`  ${e}\n`);
    console.error(
      `If a flagged file is already applied to production and cannot be renamed, add it to ${baselinePath}.`
    );
    process.exit(1);
  }

  console.log(
    `✓ Migration check passed (${files.length} files, ${baseline.allowedDuplicatePrefixes.size} baselined collisions).`
  );
}

main();
