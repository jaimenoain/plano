#!/usr/bin/env node
/**
 * File-size advisory (Phase 1, Theme F) — zero-dependency, NON-BLOCKING.
 *
 * Prints a sorted table of source files over a soft LOC budget, as a decomposition signal for
 * reviewers. It ALWAYS exits 0 — it never fails CI. The budgets are intentionally generous; the
 * point is to flag the handful of god-files, not to nag about every large module.
 *
 * Budgets (by path role):
 *   pages       ≤ 800   (src/**\/pages/** or *.page.tsx)
 *   data hooks  ≤ 300   (src/**\/hooks/** or use*.ts(x))
 *   components  ≤ 400   (everything else under src/**\/components/**)
 *   other .ts(x) ≤ 400  (fallback)
 *
 * Usage: `node scripts/check-file-sizes.mjs`
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(repoRoot, "src");

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

function main() {
  let files;
  try {
    files = walk(srcDir);
  } catch (err) {
    console.warn(`⚠ file-size check skipped: ${err.message}`);
    return; // non-blocking
  }

  const over = [];
  for (const full of files) {
    const relPath = relative(repoRoot, full);
    if (EXCLUDE_RE.some((re) => re.test(relPath))) continue;
    try {
      if (!statSync(full).isFile()) continue;
      const loc = readFileSync(full, "utf8").split("\n").length;
      const { role, limit } = budgetFor(relPath);
      if (loc > limit) over.push({ relPath, loc, role, limit, overBy: loc - limit });
    } catch {
      // ignore unreadable file
    }
  }

  if (over.length === 0) {
    console.log("✓ No source files over their soft size budget.");
    return;
  }

  over.sort((a, b) => b.overBy - a.overBy);
  console.log(`\nℹ ${over.length} file(s) over their soft size budget (advisory — not blocking):\n`);
  console.log("  over | loc  | budget | role       | file");
  console.log("  -----+------+--------+------------+----------------------------------------");
  for (const o of over) {
    const over = String(o.overBy).padStart(4);
    const loc = String(o.loc).padStart(4);
    const limit = String(o.limit).padStart(6);
    const role = o.role.padEnd(10);
    console.log(`  ${over} | ${loc} | ${limit} | ${role} | ${o.relPath}`);
  }
  console.log("\n  Soft budgets: pages ≤ 800, components ≤ 400, hooks ≤ 300. Consider decomposition.");
}

main();
