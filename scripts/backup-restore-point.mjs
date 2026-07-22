#!/usr/bin/env node
/**
 * Pre-destructive-migration restore point (docs/decisions/0012-data-safety-rails.md)
 * — zero-dependency, Node built-ins only (shells out to the Supabase CLI).
 *
 * On the free tier there is no automatic restore point and no PITR
 * (PRINCIPLES.md §7). This is the scripted substitute: run it by hand right
 * BEFORE applying a destructive or irreversible migration, so there is a
 * point-in-time logical dump to roll back to if the migration goes wrong.
 *
 * What it does:
 *   - Takes a logical dump of production (roles + schema + data) via the
 *     Supabase CLI into a gitignored `backups/restore-point-<UTC>/` directory
 *     and bundles it as `backups/restore-point-<UTC>.tar.gz`.
 *   - Prints how to restore it (into production to roll back, or into a local
 *     throwaway Postgres to REHEARSE the migration first).
 *
 * What it deliberately does NOT do:
 *   - It does not apply, alter, or delete anything — the dump is read-only.
 *   - It does not replace the scheduled daily backup (.github/workflows/backup.yml);
 *     it is the finer-grained "right before this change" safety net.
 *   - It is not the automated pattern the charter ultimately wants: adopt the
 *     template's automated restore-point mechanism once it lands (it assumes a
 *     paid tier); until then this manual step is what ships.
 *
 * Requires SUPABASE_DB_URL in the environment (see .env.local / the
 * SUPABASE_DB_URL repo secret): the "Session pooler" connection string from
 * Supabase → Project Settings → Database.
 *
 * Usage: `SUPABASE_DB_URL=... node scripts/backup-restore-point.mjs`
 */

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "✖ SUPABASE_DB_URL is not set. Export the production connection string first:\n" +
      "    export SUPABASE_DB_URL='postgresql://...'   # Supabase → Project Settings → Database → Session pooler\n" +
      "  then re-run `node scripts/backup-restore-point.mjs`.",
  );
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(repoRoot, "backups", `restore-point-${stamp}`);
mkdirSync(outDir, { recursive: true });

/** Run one Supabase CLI dump, streaming its output to the terminal. */
function dump(label, args, outFile) {
  console.log(`• dumping ${label} …`);
  execFileSync(
    "npx",
    ["--yes", "supabase", "db", "dump", "--db-url", dbUrl, ...args, "-f", outFile],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
}

try {
  dump("roles", ["--role-only"], join(outDir, "roles.sql"));
  dump("schema", [], join(outDir, "schema.sql"));
  dump("data", ["--use-copy", "--data-only"], join(outDir, "data.sql"));

  const archive = join(repoRoot, "backups", `restore-point-${stamp}.tar.gz`);
  execFileSync(
    "tar",
    ["-czf", archive, "-C", join(repoRoot, "backups", `restore-point-${stamp}`), "roles.sql", "schema.sql", "data.sql"],
    { stdio: "inherit" },
  );

  console.log(`\n✓ Restore point written to backups/restore-point-${stamp}.tar.gz`);
  console.log(
    "\nBefore applying the destructive migration:\n" +
      `  1. REHEARSE — restore into a throwaway local Postgres and run the migration there first:\n` +
      `       createdb rehearsal && cat ${outDir}/{roles,schema,data}.sql | psql rehearsal\n` +
      "       then apply the new migration to `rehearsal` and confirm it behaves.\n" +
      "  2. ROLL BACK (only if production is damaged) — restore this dump over production:\n" +
      `       cat ${outDir}/{roles,schema,data}.sql | psql "$SUPABASE_DB_URL"\n` +
      "\nKeep these files out of git (backups/ is gitignored) and delete them once the migration is confirmed good.",
  );
} catch (err) {
  console.error(`✖ Failed to produce the restore point: ${err.message}`);
  console.error("  Check SUPABASE_DB_URL and that the Supabase CLI can reach the database.");
  process.exit(1);
}
