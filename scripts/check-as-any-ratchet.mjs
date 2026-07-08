#!/usr/bin/env node
/**
 * `as any` / `@ts-ignore` ratchet — zero-dependency, BLOCKING.
 *
 * The app typechecks in lenient mode, so `as any` casts and `@ts-ignore` comments are the
 * main way type-unsafety leaks in. This script freezes today's per-file counts in
 * `.as-any-baseline.json` and fails CI when any file's count grows (or a new file gains one).
 *
 *   - Counts `as any` and `@ts-ignore` occurrences per tracked .ts/.tsx file under src/ and
 *     app/, excluding generated files.
 *   - Any file ABOVE its baseline count → exit 1, naming the file. Resolve the item; do not
 *     edit the baseline.
 *   - Files BELOW baseline → still green, with a reminder to run `--update` to lock it in.
 *
 * `--update` rewrites the baseline from the current run. It exists to LOWER numbers after a
 * cleanup. Raising a number to make CI pass defeats the mechanism — never do it without an
 * explicit human decision recorded in the PR description.
 *
 * Usage: `node scripts/check-as-any-ratchet.mjs [--update]`
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(repoRoot, ".as-any-baseline.json");

const SCAN_DIRS = ["src", "app"];
// Generated or vendored files we never want to ratchet.
const EXCLUDE_RE = [
  /^src\/integrations\/supabase\/types\.ts$/,
  /^src\/integrations\/supabase\/plano-tables\.types\.ts$/,
];
const PATTERNS = [/\bas any\b/g, /@ts-ignore/g];

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function collectCounts() {
  const counts = new Map(); // relPath -> occurrence count
  for (const dir of SCAN_DIRS) {
    for (const full of walk(join(repoRoot, dir))) {
      const relPath = relative(repoRoot, full);
      if (EXCLUDE_RE.some((re) => re.test(relPath))) continue;
      let text;
      try {
        text = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      let n = 0;
      for (const re of PATTERNS) n += (text.match(re) ?? []).length;
      if (n > 0) counts.set(relPath, n);
    }
  }
  return counts;
}

const sortedObject = (entries) =>
  Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));

function writeBaseline(counts) {
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        comment:
          "Per-file ceiling for `as any` + `@ts-ignore` occurrences. CI fails if any " +
          "file EXCEEDS its count (files absent here allow 0). Only lower numbers via " +
          "--update after a cleanup; never raise one to make CI pass.",
        files: sortedObject(counts.entries()),
      },
      null,
      2
    ) + "\n"
  );
}

function main() {
  const update = process.argv.includes("--update");
  const counts = collectCounts();
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  if (update) {
    writeBaseline(counts);
    console.log(`✓ Baseline written to ${baselinePath} (${total} occurrences across ${counts.size} files).`);
    return;
  }

  let baseline;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8")).files ?? {};
  } catch (err) {
    console.error(
      `✖ Could not read baseline at ${baselinePath}: ${err.message}\n` +
        `  Seed it with: node scripts/check-as-any-ratchet.mjs --update`
    );
    process.exit(1);
  }

  const allFiles = new Set([...Object.keys(baseline), ...counts.keys()]);
  const regressions = [];
  const improvements = [];
  for (const file of [...allFiles].sort()) {
    const allowed = baseline[file] ?? 0;
    const actual = counts.get(file) ?? 0;
    if (actual > allowed) regressions.push({ file, allowed, actual });
    else if (actual < allowed) improvements.push({ file, allowed, actual });
  }

  if (improvements.length > 0) {
    console.log("↓ Files below baseline — lock the improvement in with `--update`:");
    for (const { file, allowed, actual } of improvements) {
      console.log(`  - ${file}: ${actual} (baseline ${allowed})`);
    }
  }

  if (regressions.length > 0) {
    console.error("\n✖ as-any ratchet failed — new `as any` / `@ts-ignore` introduced:\n");
    for (const { file, allowed, actual } of regressions) {
      console.error(`  +${actual - allowed}  ${file} (${actual}, baseline allows ${allowed})`);
    }
    console.error(
      "\nType the value properly (generated DB types cover most cases) instead of casting.\n" +
        "Resolve the item; do not edit the baseline."
    );
    process.exit(1);
  }

  console.log(`✓ as-any ratchet passed (${total} occurrences across ${counts.size} files, all at or below baseline).`);
}

main();
