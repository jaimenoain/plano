# 0018 — Types-staleness gate

**Status:** accepted (mechanism live since the CI types-staleness job; recorded retroactively 2026-07-23)

**Context.** plano's Supabase types (`src/integrations/supabase/types.ts`) are generated from the
live schema by `npm run gen-types`. Schema changes ship as migrations
([`docs/migrations.md`](../migrations.md)); if a PR changes the schema but forgets to regenerate
the types, the checked-in types silently drift from the database and the whole point of
generated types — compile-time truth about the schema — is lost. The project rule is
"migrations + gen-types in the same PR" ([`CLAUDE.md`](../../CLAUDE.md)), and this gate enforces
it. It is the "types-staleness gate" the principles audit lists among the required PR checks
(`docs/specs/principles-alignment.md` §5) and the enforced-but-undocumented mechanisms
(§11 gap (d)).

**Decision.** The `types-staleness` job in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (lines ~139–153) runs
[`scripts/check-types-staleness.mjs`](../../scripts/check-types-staleness.mjs) — a
zero-dependency, blocking script that **never contacts Supabase** (no token needed). It diffs the
PR against `origin/$GITHUB_BASE_REF`; if any file under `supabase/migrations/` changed but
`types.ts` did not, it fails and tells the author to run `npm run gen-types` and commit the
result. The checkout uses `fetch-depth: 0` because a shallow checkout would make the base-ref
diff silently empty. The one **escape hatch** is a `-- types-neutral: <reason>` marker line
inside a migration, for genuinely types-neutral changes (a `create or replace function` that
touches only a body, a data backfill). It is **not a blanket skip**: every changed migration must
either update `types.ts` or carry the marker, so any un-marked real schema change still fails —
and because the marker lives in the migration diff, the exemption is auditable in the PR.

**Rejected alternative.** Trusting authors to remember the regen — rejected: this is precisely
the boring, mechanical check a gate should own rather than a human (principle 5), and drift is
invisible until something breaks. Having the check regenerate types itself in CI (contacting
Supabase) — rejected: it would need a token in CI and could mask the author's omission instead of
surfacing it; keeping the check offline and blocking keeps it fast and secret-free.
