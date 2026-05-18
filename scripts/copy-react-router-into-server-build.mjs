/**
 * Vercel's Node file tracer can miss .mjs export targets from react-router
 * packages. Force server resolution to .js entrypoints and avoid duplicate
 * react-router copies in per-bundle node_modules.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverBuildDir = join(root, "build", "server");
const reactRouterPackageJson = join(root, "node_modules", "react-router", "package.json");
const reactRouterNodePackageJson = join(root, "node_modules", "@react-router", "node", "package.json");

function forceNodeJsEntrypoints(packageJsonPath) {
  if (!existsSync(packageJsonPath)) {
    console.error(`[copy-react-router] Missing ${packageJsonPath}`);
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  if (typeof pkg.module === "string" && pkg.module.endsWith(".mjs")) {
    pkg.module = pkg.module.replace(/\.mjs$/, ".js");
  }

  if (pkg.exports?.["."]?.node) {
    for (const key of ["module", "module-sync", "default"]) {
      const value = pkg.exports["."].node[key];
      if (typeof value === "string" && value.endsWith(".mjs")) {
        pkg.exports["."].node[key] = value.replace(/\.mjs$/, ".js");
      }
    }
  }

  if (pkg.exports?.["."]?.module?.default?.endsWith?.(".mjs")) {
    pkg.exports["."].module.default = pkg.exports["."].module.default.replace(/\.mjs$/, ".js");
  }

  if (pkg.exports?.["."]?.import?.default?.endsWith?.(".mjs")) {
    pkg.exports["."].import.default = pkg.exports["."].import.default.replace(/\.mjs$/, ".js");
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

if (!existsSync(serverBuildDir)) {
  console.error("[copy-react-router] build/server missing — run react-router build first");
  process.exit(1);
}

const bundles = readdirSync(serverBuildDir, { withFileTypes: true }).filter(
  (entry) => entry.isDirectory() && entry.name.startsWith("nodejs_"),
);

if (bundles.length === 0) {
  console.error("[copy-react-router] No nodejs_* bundles under build/server");
  process.exit(1);
}

for (const bundle of bundles) {
  const duplicatePackageDir = join(serverBuildDir, bundle.name, "node_modules", "react-router");
  if (existsSync(duplicatePackageDir)) {
    rmSync(duplicatePackageDir, { recursive: true, force: true });
    console.log(`[copy-react-router] ${bundle.name}: removed duplicate bundled react-router copy`);
  }
}

forceNodeJsEntrypoints(reactRouterPackageJson);
forceNodeJsEntrypoints(reactRouterNodePackageJson);
