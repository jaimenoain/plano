#!/usr/bin/env node
/**
 * Postbuild patch: ensures /__manifest is never CDN-cached.
 *
 * react-router build (via the Vercel adapter) generates .vercel/output/config.json
 * with s-maxage=86400 on /__manifest. That 24-hour CDN cache is the confirmed root
 * cause of users always seeing stale code: React Router uses /__manifest on every
 * client-side navigation to discover which JS chunks to load. A stale manifest means
 * old chunk URLs are loaded — and old chunks exist on Vercel's CDN from previous
 * deploys, so users get old code silently.
 *
 * This script runs after every build and forces Cache-Control: no-store on that route.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve(".vercel/output/config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

let patched = false;
config.routes = config.routes.map((route) => {
  if (route.src === "^/__manifest$") {
    const old = route.headers?.["Cache-Control"] ?? "(none)";
    route.headers = { ...route.headers, "Cache-Control": "no-store" };
    console.log(`[patch-vercel-manifest-cache] /__manifest Cache-Control: ${old} → no-store`);
    patched = true;
  }
  return route;
});

if (!patched) {
  // Route not found — add it explicitly before the filesystem handler.
  const filesystemIdx = config.routes.findIndex((r) => r.handle === "filesystem");
  const insertAt = filesystemIdx === -1 ? config.routes.length : filesystemIdx;
  config.routes.splice(insertAt, 0, {
    src: "^/__manifest$",
    headers: { "Cache-Control": "no-store" },
    continue: true,
  });
  console.log("[patch-vercel-manifest-cache] /__manifest rule not found — inserted before filesystem handler");
}

writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
console.log("[patch-vercel-manifest-cache] Done.");
