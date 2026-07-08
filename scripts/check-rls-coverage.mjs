#!/usr/bin/env node
/**
 * RLS coverage check — zero-dependency, static parse of supabase/migrations/*.sql.
 *
 * Every table created in the public schema must have ROW LEVEL SECURITY enabled by some
 * migration. A table without RLS is readable/writable by any authenticated client with the
 * anon key — on this app that is a data-exposure bug by default.
 *
 * Static parsing, so it checks migration hygiene, not the live database (tables predating
 * the migration history, or PostGIS-owned tables like spatial_ref_sys, are out of scope —
 * see docs/AI_STATUS.md for the live-DB story). Known-acceptable exceptions may be listed in
 * `.rls-coverage-baseline.json`; that list may only shrink. If this check fails, write a
 * migration enabling RLS + policies for the new table; do not edit the baseline.
 *
 * Usage: `node scripts/check-rls-coverage.mjs`
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const baselinePath = join(repoRoot, ".rls-coverage-baseline.json");

const NON_PUBLIC_SCHEMA_RE = /^(auth|storage|extensions|realtime|vault|graphql|cron|net|supabase_functions)\./i;
const IDENT = String.raw`([a-zA-Z_"][\w".]*)`;

const normalize = (name) => name.replace(/"/g, "").replace(/^public\./i, "").toLowerCase();

function main() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const created = new Set();
  const dropped = new Set();
  const rlsEnabled = new Set();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8")
      .replace(/--[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    for (const m of sql.matchAll(new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${IDENT}`, "gi"))) {
      if (NON_PUBLIC_SCHEMA_RE.test(m[1].replace(/"/g, ""))) continue;
      const t = normalize(m[1]);
      created.add(t);
      dropped.delete(t); // re-created after a drop
    }
    for (const m of sql.matchAll(new RegExp(String.raw`drop\s+table\s+(?:if\s+exists\s+)?${IDENT}`, "gi"))) {
      dropped.add(normalize(m[1]));
    }
    for (const m of sql.matchAll(
      new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${IDENT}\s+enable\s+row\s+level\s+security`, "gi")
    )) {
      rlsEnabled.add(normalize(m[1]));
    }
  }

  let baseline = [];
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8")).allowedWithoutRls ?? [];
  } catch {
    // no baseline file → nothing is exempt
  }

  const live = [...created].filter((t) => !dropped.has(t));
  const uncovered = live.filter((t) => !rlsEnabled.has(t) && !baseline.includes(t)).sort();

  if (uncovered.length > 0) {
    console.error(
      `✖ RLS coverage: ${uncovered.length} table(s) created in migrations without ROW LEVEL SECURITY:\n`
    );
    for (const t of uncovered) console.error(`  - public.${t}`);
    console.error(
      "\nWrite a migration with `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` plus the\n" +
        "appropriate policies (see .cursor/rules/01-database.mdc).\n" +
        "Resolve the item; do not edit the baseline."
    );
    process.exit(1);
  }

  const stale = baseline.filter((t) => rlsEnabled.has(t) || !live.includes(t));
  if (stale.length > 0) {
    console.log(`↓ Baseline entries no longer needed (remove them): ${stale.join(", ")}`);
  }
  console.log(
    `✓ RLS coverage: all ${live.length} public tables created in migrations have RLS enabled` +
      (baseline.length ? ` (${baseline.length} baselined exception(s)).` : ".")
  );
}

main();
