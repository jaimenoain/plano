#!/usr/bin/env node
/**
 * File-size ratchet — zero-dependency, BLOCKING.
 *
 * Source files have LOC budgets (generous on purpose — the point is stopping god-files, not
 * nagging). Files already over budget are grandfathered in `.file-size-baseline.json` at their
 * frozen size and may only shrink. CI fails when:
 *
 *   - a file NOT in the baseline exceeds its budget (new god-file), or
 *   - a baselined file GROWS past its frozen size (existing god-file getting worse).
 *
 * Budgets (by path role):
 *   pages       ≤ 800   (src/**\/pages/** or *.page.tsx)
 *   data hooks  ≤ 300   (src/**\/hooks/** or use*.ts(x))
 *   components  ≤ 400   (everything else under src/**\/components/**)
 *   other .ts(x) ≤ 400  (fallback)
 *
 * `--update` rewrites the baseline from the current run. It exists to LOWER numbers after a
 * decomposition (a baselined file back under budget drops out entirely). Raising a number to
 * make CI pass defeats the mechanism — never do it without an explicit human decision recorded
 * in the PR description.
 *
 * Usage: `node scripts/check-file-sizes.mjs [--update]`
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(repoRoot, "src");
const baselinePath = join(repoRoot, ".file-size-baseline.json");

// Generated or vendored files we never want to flag.
const EXCLUDE_RE = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /\/integrations\/supabase\/types\.ts$/,
  /\/integrations\/supabase\/plano-tables\.types\.ts$/,
  /\/components\/ui\//,
];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
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

function budgetFor(relPath) {
  if (/\/pages\//.test(relPath) || /\.page\.tsx$/.test(relPath)) return { role: "page", limit: 800 };
  if (/\/hooks\//.test(relPath) || /\/use[A-Z][^/]*\.tsx?$/.test(relPath)) return { role: "hook", limit: 300 };
  if (/\/components\//.test(relPath)) return { role: "component", limit: 400 };
  return { role: "other", limit: 400 };
}

function collectOverBudget() {
  const over = [];
  for (const full of walk(srcDir)) {
    const relPath = relative(repoRoot, full);
    if (EXCLUDE_RE.some((re) => re.test(relPath))) continue;
    try {
      if (!statSync(full).isFile()) continue;
      const loc = readFileSync(full, "utf8").split("\n").length;
      const { role, limit } = budgetFor(relPath);
      if (loc > limit) over.push({ relPath, loc, role, limit });
    } catch {
      // ignore unreadable file
    }
  }
  return over;
}

const sortedObject = (entries) =>
  Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));

function writeBaseline(over) {
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        comment:
          "Grandfathered over-budget files, frozen at their current LOC. CI fails if a " +
          "listed file GROWS or an unlisted file exceeds its budget (pages 800, " +
          "components 400, hooks 300, other 400). Only lower numbers via --update after " +
          "a decomposition; never raise one to make CI pass.",
        files: sortedObject(over.map((o) => [o.relPath, o.loc])),
      },
      null,
      2
    ) + "\n"
  );
}

function main() {
  const update = process.argv.includes("--update");
  const over = collectOverBudget();

  if (update) {
    writeBaseline(over);
    console.log(`✓ Baseline written to ${baselinePath} (${over.length} grandfathered files).`);
    return;
  }

  let baseline;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8")).files ?? {};
  } catch (err) {
    console.error(
      `✖ Could not read baseline at ${baselinePath}: ${err.message}\n` +
        `  Seed it with: node scripts/check-file-sizes.mjs --update`
    );
    process.exit(1);
  }

  const regressions = [];
  const improvements = [];
  for (const o of over) {
    const frozen = baseline[o.relPath];
    if (frozen === undefined) {
      regressions.push({ ...o, kind: "new", allowed: o.limit });
    } else if (o.loc > frozen) {
      regressions.push({ ...o, kind: "grew", allowed: frozen });
    } else if (o.loc < frozen) {
      improvements.push({ ...o, allowed: frozen });
    }
  }
  // Baselined files now back under budget (or deleted) — baseline can shrink.
  const currentOver = new Set(over.map((o) => o.relPath));
  for (const relPath of Object.keys(baseline)) {
    if (!currentOver.has(relPath)) improvements.push({ relPath, loc: null, allowed: baseline[relPath] });
  }

  if (improvements.length > 0) {
    console.log("↓ Files below their frozen size — lock the improvement in with `--update`:");
    for (const { relPath, loc, allowed } of improvements) {
      console.log(`  - ${relPath}: ${loc ?? "under budget/removed"} (baseline ${allowed})`);
    }
  }

  if (regressions.length > 0) {
    console.error("\n✖ File-size ratchet failed:\n");
    for (const { relPath, loc, role, limit, kind, allowed } of regressions) {
      const reason =
        kind === "new"
          ? `new over-budget file (${role} budget ${limit})`
          : `grandfathered file grew (frozen at ${allowed})`;
      console.error(`  ${String(loc).padStart(5)} loc  ${relPath} — ${reason}`);
    }
    console.error(
      "\nExtract components/hooks/api modules until the file is back at or under the line.\n" +
        "Resolve the item; do not edit the baseline."
    );
    process.exit(1);
  }

  console.log(
    `✓ File-size ratchet passed (${over.length} grandfathered files, none grew; budgets: pages 800, components 400, hooks 300, other 400).`
  );
}

main();
