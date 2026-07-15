# Adding a Mobile App — Optional Guide

> **Audience:** the coding agent, asked by the product owner to add a native
> mobile app to a project stamped from this template.
>
> **When to use:** only when the product actually needs one. This template ships
> web-only by default (`docs/decisions/0005-mobile-removed-from-template.md`).
> Nothing here runs during normal bootstrapping — the six steps in the root
> `README.md` never touch mobile.

> **Universal rules live in `.cursor/rules/`.** This guide is procedure, not
> policy. It does not restate the architecture, database, or auth rules.

---

## Before you start: is mobile the right call?

Adding a native app roughly doubles the surface area of the project — a second
dependency tree, a second build pipeline (EAS), app-store review cycles, and a
second set of auth and storage concerns. Most products do not need one on day
one, and a responsive web app covers the majority of cases.

Add mobile when the product genuinely requires something the web cannot give it:
push notifications, offline-first behaviour, camera or biometric access, or
distribution through the app stores. "It would be nice to have an app" is not
one of those reasons.

If the answer is still yes, read the whole of this guide before running any
command. The last section is the one that matters most.

---

## 1. Scaffold the workspace

The root `package.json` globs `apps/*`, so a new directory under `apps/` is
picked up as a workspace with no root edits.

```bash
npx create-expo-app@latest apps/mobile --no-install --template blank-typescript
```

Then, in `apps/mobile/package.json`:

- Set `"name": "@my-app/mobile"` and `"private": true`. **The `@my-app/*`
  workspace scope is never renamed** — it is internal plumbing that every
  cross-package import depends on (`docs/AGENT_GUIDE.md` §11).
- Add `"@my-app/supabase": "*"` to `dependencies` so the app compiles against
  the same generated database types as the web app. This is the whole point of
  the monorepo: one schema, one type definition, no drift.
- Add a `typecheck` script (`tsc --noEmit`) and a `lint` script. Turbo picks
  both up automatically; a workspace without them is silently skipped by
  `npm run typecheck` and `npm run lint`, which is exactly the hole that got the
  previous mobile skeleton removed.

Do **not** add a `build` script. Mobile binaries are built by EAS
(`eas build --platform ios`), not by `turbo run build`, and a `build` script
would make CI try to build an app binary on every pull request.

Run `npm install` from the repo root — never from inside `apps/mobile` — so the
lockfile stays coherent.

---

## 2. Environment variables

Expo exposes variables to the client bundle under the `EXPO_PUBLIC_` prefix,
where Next.js uses `NEXT_PUBLIC_`. The values are identical — they name the same
Supabase project — only the prefix differs.

| Web                             | Mobile                          |
| ------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `EXPO_PUBLIC_SUPABASE_URL`      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

Set them in EAS Secrets for builds (`eas secret:create`) and in a local
`.env` for `expo start`. The service-role key is **never** exposed to a mobile
client under any prefix — it bypasses every RLS policy you wrote.

---

## 3. The Supabase client — token storage is the part that matters

The web app uses `@supabase/ssr` (cookie-based sessions, refreshed in
middleware). None of that applies on a device: there is no middleware, no
cookie jar, and no server render. Mobile uses the plain client from
`packages/supabase` plus an explicit storage adapter.

**Store the session in SecureStore, never AsyncStorage.** SecureStore is backed
by the device keychain — Keychain Services on iOS, the Keystore system on
Android — so tokens are encrypted at rest and protected by the OS. AsyncStorage
is an unencrypted key–value file; any process that can read the app's sandbox
(a rooted or jailbroken device, a forensic image, a backup) can read the user's
session token straight out of it. This is the single most important line of
code in a mobile Supabase app.

Create `apps/mobile/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@my-app/supabase'
import * as SecureStore from 'expo-secure-store'

/**
 * SecureStore-backed session storage. SecureStore is the device keychain
 * (Keychain on iOS, Keystore on Android); AsyncStorage is unencrypted and
 * must never hold an auth token.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // No URL to parse on a device — this is a web-only OAuth concern, and
      // leaving it on makes the client look for a session in a location that
      // does not exist.
      detectSessionInUrl: false,
    },
  },
)
```

The adapter is worthless unless it is passed into `auth.storage`. Defining it
and forgetting to wire it up leaves Supabase on its default storage and gives
you a false sense of security — that is exactly the bug the removed skeleton
shipped with, and why this guide spells the wiring out.

`packages/supabase` also exports `createSupabaseClient(url, anonKey)` for
non-Next.js contexts. It does not take auth options, so for mobile call
`createClient` directly as above; use `createSupabaseClient` only where the
default storage is acceptable.

Add `expo-secure-store` to `apps/mobile/package.json` and list it in the
`plugins` array of `app.json`.

---

## 4. EAS build configuration

Create `apps/mobile/eas.json` with the three conventional profiles —
`development` (dev client, internal distribution), `preview` (internal
distribution for testers), and `production` (`autoIncrement: true`). Set
`bundleIdentifier` (iOS) and `package` (Android) in `app.json` to a real
reverse-DNS identifier before the first build; they cannot be changed after a
store submission.

**EAS builds stay out of CI.** They need EAS authentication and burn build
credits on every run, so they are triggered from the EAS dashboard or a local
`eas build` invocation, not from `.github/workflows/ci.yml`. The mobile
workspace's `lint` and `typecheck` scripts still run on every pull request via
the existing turbo tasks — that is the coverage CI gives you.

---

## 5. Write the rules before you write the features

**No rule file in `.cursor/rules/` governs mobile.** The rules that exist assume
a Next.js App Router web app: `04-auth.mdc` describes `@supabase/ssr` and
middleware session refresh, `02-api.mdc` describes Server Actions, `03-frontend.mdc`
describes Tailwind and Shadcn. None of that transfers to React Native.

Do not extend the web rules to mobile by analogy, and do not let an agent build
mobile features against them. Write a mobile ruleset first — covering the React
Native Supabase client, SecureStore session handling, navigation, and the EAS
build and release process — and only then start on features. An agent working
from rules that describe a different runtime produces confident, wrong code.

The shared Tailwind preset (`packages/config/tailwind/base.ts`) is
platform-agnostic and can seed a NativeWind config, but web and mobile
deliberately share **no UI components** — SEO and native performance pull in
opposite directions. They share design tokens and database types, nothing more.

---

## 6. What the git history holds

An earlier revision of this template shipped an inert `apps/mobile` skeleton
(Expo SDK 51, expo-router, two placeholder screens). It was removed because it
was unused, ungoverned, untested, and dragged transitive CVEs into the audit
job. The reasoning is in `docs/decisions/0005-mobile-removed-from-template.md`.

To read the removed files rather than rebuild from scratch:

```bash
git log --diff-filter=D -- apps/mobile   # find the commit that removed it
git show <commit>^:apps/mobile/lib/supabase.ts
```

Treat it as reference only. Its SecureStore adapter was never wired into the
client — the corrected version is in §3 above.
