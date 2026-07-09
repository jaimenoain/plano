# Migration — the Plano refresh playbook

The goal of this package is not "read the docs" — it's to **refresh existing Plano surfaces to the
current design system, precisely, one at a time.** This is the order to work in and the gates to pass.
It sits on top of the repo's own rollout docs; it does not replace them.

## Where the repo already tracks this work

Read these before touching a surface — they are the execution baseline and they are largely marked
complete, so your job is usually *conformance*, not first-pass rollout:

- `docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md` — every surface, its file, complexity, and refinement status.
  **Start here to find the file that owns the screen you're changing.**
- `docs/DESIGN_SYSTEM_ROLLOUT_STANDARDS.md` — the standards each surface must meet.
- `docs/DESIGN_SYSTEM_PAGE_AUDITS.md` — per-page audit rows (what was found / fixed).
- `docs/DESIGN_SYSTEM_QA_CHECKLIST.md` — the repo's own QA gate. Run it alongside this package's
  `CHECKLIST.md`; where they overlap on a **design decision**, this design system wins (bring the repo gate
  into line).
- `docs/DESIGN_SYSTEM_RELEASE_PLAN.md` — sequencing/release context.

## The loop for refreshing one surface

1. **Locate.** Find the surface in `DESIGN_SYSTEM_SCREEN_INVENTORY.md`; open its file under `src/`.
   Note its current refinement status — don't redo a `refined` surface without reason.
2. **Read the intent.** Skim the matching recipe in `PATTERNS.md` and the components it uses in
   `COMPONENTS.md`. Confirm token values against `docs/DESIGN_TOKENS.md` (see `SOURCE-OF-TRUTH.md`).
3. **Diff against the system.** Walk the screen against `CHECKLIST.md`. The failures cluster in four
   places, in priority order:
   - **Type scale hedged** — headlines sitting at a safe medium instead of pushed to editorial scale.
     This is the #1 reason a Plano screen looks flat. Fix it first; it moves the needle most.
   - **Stray colour** — any `brand-accent` / lime outside its sanctioned uses (primary button, focus ring,
     hover `→`, one `.accent-tag` pill, `::selection`, bell dot); lime rating dots (they're black); any raw
     hex or raw palette ramp. Everything else should be monochrome tokens.
   - **Boxed where it should float** — feed/content cards with borders, backgrounds, or shadows; rounded
     corners on imagery or content-detail chrome (should be `radius-none`).
   - **Cramped** — section gaps below 48px, feed-item gaps below 64px.
4. **Change only that surface.** Reuse existing components (`src/components/ui`, `src/components/layout`);
   don't fork a one-off variant. Preserve surrounding layout, spacing, and tokens.
5. **Never introduce a raw value.** Every colour/space/radius/font maps to a token. If a token is
   missing, propose adding it to `docs/DESIGN_TOKENS.md` + `tailwind.config.ts` — don't hardcode.
6. **Gate.** Pass this package's `CHECKLIST.md` **and** `docs/DESIGN_SYSTEM_QA_CHECKLIST.md`. Update the
   audit row in `DESIGN_SYSTEM_PAGE_AUDITS.md` / status in the inventory if your repo tracks it there.

## Priorities when refreshing many surfaces

1. **Global chrome first** — `AppTopNav`, the right rail, `MobileTopBar` / `BottomNav`, `SiteFooter`.
   Chrome sets the frame every other screen inherits; fixing it lifts everything.
2. **The feed** — Plano's signature surface and the one most often mistaken for a generic social app.
3. **Content-detail surfaces** — building detail (the reference for `radius-none` throughout), profile,
   architect profile.
4. **Map / search**, then **admin / settings / forms** (the only surfaces where a sidebar and boxed
   cards are legitimate).

## What "done" looks like

The surface reads as an architecture magazine, not a product screen: one confident headline at real
scale, generous air, sharp monochrome imagery (or an on-brand `.photo-placeholder`), and lime spent only on
its sanctioned uses (the primary button, focus ring, hover `→`, one `.accent-tag` pill). Rating dots are
black, shown only when earned. If lime shows up anywhere else, it isn't done.
