# Playbook — Vercel runtime `ERR_MODULE_NOT_FOUND` (nft / serverless bundle)

Use when: **build succeeds**, **invocation fails** with `Cannot find module '.../node_modules/<pkg>/.../*.mjs'`.

Cursor rule: `.cursor/rules/07-vercel-deployments.mdc`.

---

## Quick check

1. Vercel Dashboard → Project → **Logs** (runtime, not build).
2. Error contains `ERR_MODULE_NOT_FOUND` and a path under `node_modules/` ending in `.mjs` (often `dist/development/`).
3. If yes → continue below (same class of bug as React Router 7 + `@vercel/remix-builder`; other packages with `module-sync` in `exports` can hit it too).

---

## Step 1 — Trace the function bundle (do this before any config patch)

```bash
cd <vercel-app-root>   # e.g. app/ in a monorepo
rm -rf .vercel/output
npx vercel build --prod --yes
FUNC=$(ls -d .vercel/output/functions/*.func 2>/dev/null | head -1)
jq '.handler, (.filePathMap | keys | map(select(test("<package-from-error>"))))' \
  "$FUNC/.vc-config.json"
```

- If the **exact path from the runtime error** is **not** in the list → **nft trace gap** (not install, not `ssr.noExternal` alone).
- Handler path shows the real entry (often auto-generated `server-index.mjs`, not your repo).

---

## Step 2 — Smell tests (React Router 7 class)

| Signal                                                          | Implication                                         |
| --------------------------------------------------------------- | --------------------------------------------------- |
| Framework Preset = **Vite** but app is **React Router** / Remix | Wrong builder path — set Preset to **React Router** |
| `server-index.mjs` imports `react-router`                       | Wrapper is outside your Vite SSR bundle             |
| CSS-only or no-op commit broke prod                             | Likely Vercel builder auto-update                   |
| `npm ci` logs clean; file exists in build env                   | Failure is **bundle**, not install                  |

---

## Step 3 — Emergency restore

```bash
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes
```

Confirm `.vercel/project.json` links to the correct production project.

If cache poisoned: redeploy without cache.

---

## Step 4 — Durable fix (React Router 7+)

### Post-build copy script

Create `scripts/copy-react-router-into-server-build.mjs` in the app root:

```javascript
import { cpSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const src = join(appRoot, 'node_modules', 'react-router')

if (!existsSync(src)) {
  console.error(
    'copy-react-router: node_modules/react-router not found — run npm ci first',
  )
  process.exit(1)
}

const serverRoot = join(appRoot, 'build', 'server')
if (!existsSync(serverRoot)) {
  console.error(
    'copy-react-router: build/server not found — run react-router build first',
  )
  process.exit(1)
}

let copied = 0
for (const entry of readdirSync(serverRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('nodejs_')) continue
  const destDir = join(serverRoot, entry.name, 'node_modules', 'react-router')
  cpSync(src, destDir, { recursive: true })
  copied++
}

if (copied === 0) {
  console.error(
    'copy-react-router: no nodejs_* server bundles under build/server',
  )
  process.exit(1)
}

console.log(`copy-react-router: copied into ${copied} server bundle(s)`)
```

### package.json

```json
"build": "react-router build && node ./scripts/copy-react-router-into-server-build.mjs"
```

### vercel.json

Use plain `"installCommand": "npm ci"` — remove reinstall/cache-bust workarounds.

### Verify

```bash
npm run build
ls build/server/*/node_modules/react-router/dist/development/index.mjs

npx vercel build --prod --yes
FUNC=$(ls -d .vercel/output/functions/*.func | head -1)
jq '.filePathMap | keys | map(select(test("node_modules/react-router/dist/development/index\\.mjs")))' \
  "$FUNC/.vc-config.json"
```

Non-empty `jq` output → trace includes the file.

---

## Step 5 — Dashboard hygiene

1. **Framework Preset** → React Router (not Vite).
2. **Root Directory** → app subfolder if applicable.
3. File Vercel support with failing vs last-good deployment IDs.

---

## What not to try first

| Attempt                                 | Why it fails for this bug                                     |
| --------------------------------------- | ------------------------------------------------------------- |
| `ssr.noExternal: ["react-router"]` only | Does not affect Vercel’s `server-index.mjs`                   |
| `installCommand` reinstall guard        | File already present after `npm ci`; nft drops it from bundle |
| Alias / unrelated vite tweaks           | Not on the failure path                                       |

---

## Reference incident

Documented production incident (2026-05-18): Vercel CLI 53.x server builder nft omitted `react-router/dist/development/index.mjs` while Node 24 resolved `module-sync` to that path. Durable mitigation: colocated `node_modules/react-router` copy next to each `nodejs_*` server bundle.
