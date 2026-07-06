#!/usr/bin/env node
/**
 * ESLint warning ratchet — zero-dependency, Node built-ins only.
 *
 * CI tolerates ESLint *warnings* (the boundary rules are warn-level because a large
 * backlog predates them), which means the backlog can silently GROW. This script turns
 * that into a one-way ratchet:
 *
 *   - Runs `eslint . -f json`, buckets every warning, and compares each bucket's count
 *     against `.eslint-warning-baseline.json` (repo root).
 *   - Any bucket ABOVE its baseline → exit 1, listing the files carrying the new
 *     violations. Fix the new violation — do not raise the baseline.
 *   - A bucket not present in the baseline defaults to 0, so any future warn-level rule
 *     is automatically ratcheted from its first occurrence.
 *   - Any bucket BELOW its baseline → still green, but prints a reminder to run
 *     `node scripts/check-eslint-ratchet.mjs --update` so the ceiling comes down and
 *     the improvement is locked in.
 *
 * `--update` rewrites the baseline from the current run. It exists to LOWER numbers
 * after a cleanup (or to seed the file). Raising a baseline number to make CI pass
 * defeats the entire mechanism — never do it without an explicit human decision
 * recorded in the PR description.
 *
 * ESLint *errors* are not this script's job — the separate `npm run lint` CI job
 * already hard-fails on them.
 *
 * Usage: `node scripts/check-eslint-ratchet.mjs [--update]`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(repoRoot, ".eslint-warning-baseline.json");
const WARNING_SEVERITY = 1;

/**
 * The two no-restricted-imports patterns guard different architecture boundaries, so
 * they ratchet independently — matched on message text since they share one ruleId.
 */
function bucketFor(message) {
  if (message.ruleId === "no-restricted-imports") {
    if ((message.message ?? "").includes("Supabase browser client")) {
      return "no-restricted-imports/supabase-client";
    }
    if ((message.message ?? "").includes("deep cross-feature")) {
      return "no-restricted-imports/deep-feature";
    }
    return "no-restricted-imports/other";
  }
  return message.ruleId ?? "other";
}

function runEslint() {
  // eslint exits 0 when there are only warnings, 1 when there are errors. Either way
  // stdout carries the JSON report, so tolerate the non-zero exit and parse what we got.
  let stdout;
  try {
    stdout = execSync("npx eslint . -f json", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 512 * 1024 * 1024,
    }).toString();
  } catch (err) {
    if (err.stdout && err.stdout.length > 0) {
      stdout = err.stdout.toString();
    } else {
      console.error(`✖ eslint did not produce a report: ${err.message}`);
      process.exit(1);
    }
  }
  try {
    return JSON.parse(stdout);
  } catch (err) {
    console.error(`✖ Could not parse eslint JSON output: ${err.message}`);
    process.exit(1);
  }
}

function collectWarnings(report) {
  const counts = new Map(); // bucket -> count
  const filesByBucket = new Map(); // bucket -> Map(file -> count)
  for (const result of report) {
    const file = relative(repoRoot, result.filePath);
    for (const message of result.messages) {
      if (message.severity !== WARNING_SEVERITY) continue;
      const bucket = bucketFor(message);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
      if (!filesByBucket.has(bucket)) filesByBucket.set(bucket, new Map());
      const perFile = filesByBucket.get(bucket);
      perFile.set(file, (perFile.get(file) ?? 0) + 1);
    }
  }
  return { counts, filesByBucket };
}

function loadBaseline() {
  try {
    const raw = JSON.parse(readFileSync(baselinePath, "utf8"));
    return { counts: raw.counts ?? {}, files: raw.files ?? {} };
  } catch (err) {
    console.error(
      `✖ Could not read baseline at ${baselinePath}: ${err.message}\n` +
        `  Seed it with: node scripts/check-eslint-ratchet.mjs --update`
    );
    process.exit(1);
  }
}

const sortedObject = (entries) =>
  Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));

function writeBaseline(counts, filesByBucket) {
  const files = sortedObject(
    [...filesByBucket.entries()].map(([bucket, perFile]) => [
      bucket,
      sortedObject(perFile.entries()),
    ])
  );
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        comment:
          "ESLint warning ceiling per bucket (with per-file detail so regressions name " +
          "the exact new files). CI fails if any bucket EXCEEDS its count. Only lower " +
          "numbers via --update after a cleanup; never raise one to make CI pass.",
        counts: sortedObject(counts.entries()),
        files,
      },
      null,
      2
    ) + "\n"
  );
}

function main() {
  const update = process.argv.includes("--update");
  const { counts, filesByBucket } = collectWarnings(runEslint());

  if (update) {
    writeBaseline(counts, filesByBucket);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    console.log(`✓ Baseline written to ${baselinePath} (${total} warnings across ${counts.size} buckets).`);
    return;
  }

  const baseline = loadBaseline();
  const allBuckets = new Set([...Object.keys(baseline.counts), ...counts.keys()]);
  const regressions = [];
  const improvements = [];

  for (const bucket of [...allBuckets].sort()) {
    const allowed = baseline.counts[bucket] ?? 0;
    const actual = counts.get(bucket) ?? 0;
    if (actual > allowed) {
      regressions.push({ bucket, allowed, actual });
    } else if (actual < allowed) {
      improvements.push({ bucket, allowed, actual });
    }
  }

  if (improvements.length > 0) {
    console.log("↓ Buckets below baseline — lock the improvement in with `--update`:");
    for (const { bucket, allowed, actual } of improvements) {
      console.log(`  - ${bucket}: ${actual} (baseline ${allowed})`);
    }
  }

  if (regressions.length > 0) {
    console.error("\n✖ Warning ratchet failed — new warnings were introduced:\n");
    for (const { bucket, allowed, actual } of regressions) {
      console.error(`  ${bucket}: ${actual} warnings (baseline allows ${allowed})`);
      // Name the exact files that grew vs the per-file baseline; fall back to the
      // highest-count files when the baseline predates per-file detail.
      const baselineFiles = baseline.files[bucket] ?? {};
      const grew = [...(filesByBucket.get(bucket) ?? new Map()).entries()]
        .map(([file, n]) => [file, n, n - (baselineFiles[file] ?? 0)])
        .filter(([, , delta]) => delta > 0)
        .sort(([, , a], [, , b]) => b - a);
      const listing =
        Object.keys(baselineFiles).length > 0
          ? grew.map(([file, , delta]) => [file, delta])
          : [...(filesByBucket.get(bucket) ?? new Map()).entries()]
              .sort(([, a], [, b]) => b - a)
              .slice(0, 15);
      for (const [file, n] of listing) {
        console.error(`    +${n}  ${file}`);
      }
      console.error("");
    }
    console.error(
      "Fix the new violation in the code you changed (the top files above are the likely " +
        "culprits). Raising the baseline is not an accepted fix."
    );
    process.exit(1);
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`✓ Warning ratchet passed (${total} warnings, all buckets at or below baseline).`);
}

main();
