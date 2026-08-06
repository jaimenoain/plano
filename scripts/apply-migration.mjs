#!/usr/bin/env node
/**
 * apply-migration.mjs — apply migration files to the production database via
 * the Supabase Management API, then optionally run a verification query.
 *
 *   node scripts/apply-migration.mjs <migration.sql> [more.sql ...] [--verify "<sql>"]
 *
 * Why this exists (2026-08-06): the Supabase MCP server (`apply_migration`) can
 * sit unauthenticated in a session, and its OAuth re-registration can fail at
 * Supabase's end ("Unrecognized client_id"). The Management API path keeps
 * working regardless — but `.env.local` holds MORE THAN ONE Supabase token, and
 * picking "the first one that exists" selects a stale one and dies with a
 * misleading "privileges" error. This script therefore VALIDATES each candidate
 * token with `select 1` and uses the first that actually works.
 *
 * The token that is known-good is SUPABASE_PERSONAL_ACCESS_TOKEN (sbp_... PAT;
 * see docs/AI_STATUS.md 2026-08-06 and the 2026-07-10 precedent). Empty-array
 * responses mean success for DDL. Never prints a secret.
 */
import { readFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

const PROJECT_REF = "lnqxtomyucnnrgeapnzt";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const TOKEN_VARS = [
  "SUPABASE_PERSONAL_ACCESS_TOKEN", // the known-good sbp_... PAT — must stay first
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PAT",
  "SUPABASE_MANAGEMENT_TOKEN",
];

// Minimal .env.local loader — no dependency, tolerates quotes and blank lines.
function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function runSql(token, sql) {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json().catch(() => ({ message: `HTTP ${res.status}, non-JSON body` }));
  const failed = !res.ok || (body && typeof body === "object" && !Array.isArray(body) && ("message" in body || "error" in body));
  return { ok: !failed, body };
}

const args = process.argv.slice(2);
const verifyIdx = args.indexOf("--verify");
const verifySql = verifyIdx === -1 ? null : args[verifyIdx + 1];
const files = (verifyIdx === -1 ? args : args.slice(0, verifyIdx)).filter(Boolean);

if (files.length === 0 && !verifySql) {
  console.error('Usage: node scripts/apply-migration.mjs <migration.sql> [...] [--verify "<sql>"]');
  process.exit(1);
}
for (const f of files) {
  if (!existsSync(f)) { console.error(`Missing file: ${f}`); process.exit(1); }
}

const env = { ...loadEnvLocal(), ...process.env };

// Find a token that WORKS, not just one that exists.
let token = null;
for (const name of TOKEN_VARS) {
  const candidate = env[name];
  if (!candidate) continue;
  const probe = await runSql(candidate, "select 1 as ok;");
  if (probe.ok) { token = candidate; console.log(`Validated: $${name} works against the SQL endpoint`); break; }
  console.log(`  $${name} is set but the API refused it — trying the next`);
}
if (!token) {
  console.error("\nNo token in .env.local (or the environment) passed validation.");
  console.error("Fix: create a PAT at https://supabase.com/dashboard/account/tokens and add it");
  console.error("to .env.local as SUPABASE_PERSONAL_ACCESS_TOKEN=sbp_...");
  process.exit(1);
}

for (const f of files) {
  const { ok, body } = await runSql(token, readFileSync(f, "utf8"));
  if (!ok) {
    console.error(`FAILED — ${basename(f)}`);
    console.error(JSON.stringify(body).slice(0, 900));
    process.exit(1);
  }
  console.log(`applied ${basename(f)}`);
}

if (verifySql) {
  const { ok, body } = await runSql(token, verifySql);
  if (!ok) {
    console.error("Verification query FAILED:");
    console.error(JSON.stringify(body).slice(0, 900));
    process.exit(1);
  }
  console.log("verify:", JSON.stringify(body, null, 2));
}
