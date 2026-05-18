/**
 * Vercel's auto-generated server-index.mjs imports "react-router" externally.
 * nft on the production builder often omits dist/development/index.mjs while Node 24
 * resolves to that path via the package exports map. Copy react-router next to each
 * server bundle so Node finds it adjacent to server-index.mjs.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverBuildDir = join(root, "build", "server");
const source = join(root, "node_modules", "react-router");
const requiredFile = join("dist", "development", "index.mjs");

if (!existsSync(source)) {
  console.error("[copy-react-router] node_modules/react-router not found — run npm ci first");
  process.exit(1);
}

if (!existsSync(join(source, requiredFile))) {
  console.error(`[copy-react-router] Missing ${join(source, requiredFile)}`);
  process.exit(1);
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
  const dest = join(serverBuildDir, bundle.name, "node_modules", "react-router");
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(source, dest, { recursive: true });

  if (!existsSync(join(dest, requiredFile))) {
    console.error(`[copy-react-router] Copy failed for ${bundle.name}`);
    process.exit(1);
  }

  console.log(`[copy-react-router] ${bundle.name}/node_modules/react-router`);
}
