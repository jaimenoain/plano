#!/usr/bin/env node
/**
 * .env.example drift check.
 *
 * The Definition of Done says a change to env vars updates `.env.example` in the
 * same PR (AGENTS.md). This makes that machine-enforced instead of prose-only:
 * every environment variable the app *reads* must be *documented*.
 *
 * Backported from the `nomi` repo (docs/decisions/0027-ai-review-batched-and-routed.md):
 * moving a check a script can do off the paid AI reviewer and onto CI. Adapted
 * for this repo's stack — Vite reads `import.meta.env.VITE_*` in browser code and
 * `process.env.*` in SSR/server code, so both forms count.
 *
 * Rule: every `import.meta.env.FOO` and `process.env.FOO` reference found in the
 * scanned source must have a matching `FOO=` key in `.env.example`, unless FOO is
 * platform-/runtime-injected (the IGNORE set below).
 *
 * Scope — `src/` and `app/`, the application surface where `.env.example` applies
 * directly. Deliberately NOT scanned:
 *   - `scripts/` — the ad-hoc verifier scripts there read non-VITE aliases
 *     (SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY) that `.env.example`
 *     documents as intentionally absent, in its own closing note. Scanning them
 *     would fail this gate on a clean tree.
 *   - `supabase/functions/` — Deno runtime, `Deno.env.get`, secrets set in the
 *     Supabase dashboard. A different config mechanism entirely.
 *
 * This is a one-directional check (read-but-undocumented). It does NOT flag
 * documented-but-unread keys: `.env.example` legitimately documents vars consumed
 * outside the scanned tree (edge functions, CI, Vercel), and flagging those would
 * be noise.
 *
 * On failure: add the variable to `.env.example` (with a real or placeholder
 * value and a comment), or — if it is genuinely platform-injected — add it to the
 * IGNORE set with a note.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Source roots to scan (relative to repo root).
const SCAN_ROOTS = ["src", "app"];

// Directory names never worth scanning: dependencies and build output.
const SKIP_DIRS = new Set([
  "node_modules",
  ".react-router",
  ".vercel",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  ".git",
]);

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// Vars injected by the runtime/platform, not configured via `.env` — legitimately
// referenced in source but never belong in `.env.example`. Keep this list boring
// and well-known; a new entry needs a reason.
const IGNORE = new Set([
  // Vite built-ins on import.meta.env
  "DEV",
  "PROD",
  "MODE",
  "SSR",
  "BASE_URL",
  // Node / OS standard
  "NODE_ENV",
  "PORT",
  "CI",
  // Vercel-injected (also covered by the VERCEL_ prefix below)
  "VERCEL",
]);

// Prefix-matched ignores for families of platform-injected vars.
const IGNORE_PREFIXES = ["VERCEL_"];

function isIgnored(name) {
  // A capture ending in `_` is a bare prefix, not a variable — it comes from
  // dynamic access built by string concatenation. Never a real key.
  if (name.endsWith("_")) return true;
  return IGNORE.has(name) || IGNORE_PREFIXES.some((p) => name.startsWith(p));
}

/**
 * Strip comments before matching. Without this the check fails on a clean tree:
 * this repo's `src/config.ts` explains itself with "we pass the explicit
 * import.meta.env.KEY ..." and `src/lib/supabase.server.ts` mentions
 * "`process.env.VITE_*` is often unset" — prose that looks exactly like a read.
 *
 * A single pass that tracks string state, so a `//` inside a URL literal
 * ("https://...") is NOT mistaken for a comment. Regex literals are not tracked;
 * a `//` inside one could truncate that line early, which can only ever cause a
 * missed reference, never a false failure.
 */
function stripComments(src) {
  let out = "";
  let i = 0;
  let quote = null; // ' " or `
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === "\\") {
        out += c + (next ?? "");
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// process.env.FOO | process.env["FOO"] | import.meta.env.FOO | import.meta.env["FOO"]
const ENV_RE =
  /(?:process|import\.meta)\.env\.([A-Z_][A-Z0-9_]*)|(?:process|import\.meta)\.env\[\s*[`'"]([A-Z_][A-Z0-9_]*)[`'"]\s*\]/g;

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // a scan root that doesn't exist is fine
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out);
    } else if (e.isFile() && SOURCE_EXTS.has(extname(e.name))) {
      out.push(join(dir, e.name));
    }
  }
}

// Collect referenced vars → the files that reference them (for a helpful error).
const referenced = new Map();
for (const root of SCAN_ROOTS) {
  const abs = join(ROOT, root);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  const files = [];
  walk(abs, files);
  for (const file of files) {
    const src = stripComments(readFileSync(file, "utf8"));
    for (const m of src.matchAll(ENV_RE)) {
      const name = m[1] ?? m[2];
      if (isIgnored(name)) continue;
      if (!referenced.has(name)) referenced.set(name, new Set());
      referenced.get(name).add(file.slice(ROOT.length + 1));
    }
  }
}

// Parse `.env.example` keys (KEY=... lines, ignoring blanks/comments).
const examplePath = join(ROOT, ".env.example");
const documented = new Set();
for (const line of readFileSync(examplePath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
  if (m) documented.add(m[1]);
}

const missing = [...referenced.keys()].filter((v) => !documented.has(v)).sort();

if (missing.length) {
  console.error(
    ".env.example DRIFT — vars read in source but not documented:\n",
  );
  for (const name of missing) {
    const files = [...referenced.get(name)].sort();
    console.error(`  ${name}`);
    for (const f of files) console.error(`      ${f}`);
  }
  console.error(
    "\n  Add each to .env.example (value or placeholder + a comment), or — if it is\n" +
      "  platform-injected — add it to the IGNORE set in scripts/check-env-example.mjs.",
  );
  process.exit(1);
}

console.log(
  `.env.example OK — ${referenced.size} env var(s) read in ${SCAN_ROOTS.join(", ")} are all documented.`,
);
