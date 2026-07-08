#!/usr/bin/env node
/**
 * Strict-TypeScript allowlist ratchet — zero-dependency, BLOCKING.
 *
 * tsconfig.strict.json typechecks a curated allowlist of files under full `strict`. The
 * migration direction is one-way: files get ADDED as they are proven strict-clean, never
 * removed to silence an error. This script freezes the allowlist size in
 * `.strict-allowlist-baseline.json` and fails CI when the `include` list shrinks below it.
 *
 * (Whether the listed files actually PASS strict mode is the advisory "Strict typecheck"
 * CI step; this ratchet only guards against quietly deleting entries.)
 *
 * `--update` records the current (larger) count after adding files. Lowering the recorded
 * count to make CI pass defeats the mechanism — never do it without an explicit human
 * decision recorded in the PR description.
 *
 * Usage: `node scripts/check-strict-allowlist.mjs [--update]`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const strictConfigPath = join(repoRoot, "tsconfig.strict.json");
const baselinePath = join(repoRoot, ".strict-allowlist-baseline.json");

function readInclude() {
  // tsconfig files allow comments — strip them before parsing.
  const raw = readFileSync(strictConfigPath, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const include = JSON.parse(raw).include;
  if (!Array.isArray(include)) {
    console.error("✖ tsconfig.strict.json has no include array.");
    process.exit(1);
  }
  return include;
}

function main() {
  const update = process.argv.includes("--update");
  const include = readInclude();

  if (update) {
    writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          comment:
            "Minimum number of files in tsconfig.strict.json include. The strict " +
            "allowlist only grows; run --update after adding files. Never lower this " +
            "to make CI pass.",
          minIncludeCount: include.length,
        },
        null,
        2
      ) + "\n"
    );
    console.log(`✓ Baseline written to ${baselinePath} (minIncludeCount: ${include.length}).`);
    return;
  }

  let min;
  try {
    min = JSON.parse(readFileSync(baselinePath, "utf8")).minIncludeCount;
  } catch (err) {
    console.error(
      `✖ Could not read baseline at ${baselinePath}: ${err.message}\n` +
        `  Seed it with: node scripts/check-strict-allowlist.mjs --update`
    );
    process.exit(1);
  }

  if (include.length < min) {
    console.error(
      `✖ Strict allowlist shrank: tsconfig.strict.json include has ${include.length} entries, ` +
        `baseline requires at least ${min}.\n` +
        "  Files are added to the strict allowlist, never removed to silence an error —\n" +
        "  fix the type error in the file instead. Resolve the item; do not edit the baseline."
    );
    process.exit(1);
  }

  if (include.length > min) {
    console.log(
      `↑ Allowlist grew to ${include.length} (baseline ${min}) — lock it in with \`--update\`.`
    );
  }
  console.log(`✓ Strict allowlist ratchet passed (${include.length} files, minimum ${min}).`);
}

main();
