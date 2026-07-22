# 0016 — Raw-hex design-token guard (ESLint)

**Status:** accepted (mechanism live since the design conformance sweep; recorded retroactively 2026-07-23)

**Context.** plano expresses colour through design-token aliases, never raw palette values or
hex ([`docs/DESIGN_TOKENS.md`](../DESIGN_TOKENS.md); `.cursor/rules/03-frontend.mdc`). A raw hex
in the shared design layer silently forks the palette and survives review easily — the lime map
markers famously lived in `.ts` constants through six conformance PRs. This is the "raw-hex /
design-token guard" the principles audit flagged as enforced-but-undocumented
(`docs/specs/principles-alignment.md` §11 gap (d)).

**Decision.** [`eslint.config.js`](../../eslint.config.js) enforces it with `no-restricted-syntax`
(lines ~186–195): the selector `Literal[value=/#[0-9a-fA-F]{3,8}/]` bans any hex-colour literal
and points the author at a token alias. It is **`error`-level**, but scoped to an **allowlist of
already-clean surfaces** (`src/components/ui`, `src/components/layout`, and the swept feature
directories `feed, buildings, localities, guides, search, explore, connect, notifications, maps,
auth`), so it only ever fires on a regression and has no warning-ratchet impact. Remaining
feature directories widen the `files` list per-surface as each is swept clean. Two deliberate
choices are recorded inline: (1) `maps` is covered as **`.ts` as well as `.tsx`** because its hex
values lived in `.ts` — its one sanctioned exception,
[`src/features/maps/constants/mapMarkerFills.ts`](../../src/features/maps/constants/mapMarkerFills.ts),
carries a documented file-level `eslint-disable`; (2) the guard does **not** port the design
system's blanket "no raw px" rule (provenance: `design-system/_adherence.oxlintrc.json`) because
that would contradict `.cursor/rules/03-frontend.mdc`, which leaves *structural* utilities
(`min-h-[120px]`) unrestricted and governs only *visual* tokens. `src/features/events` and
`src/features/collections` are intentionally excluded and the reasons are noted at the rule.

**Rejected alternative.** A repo-wide `error` from day one — rejected: unswept surfaces still
carry raw hex, so it would fail the build or invite gaming (clearing only the literals one
selector can see while leaving siblings). Warn-level like the import boundary (ADR-0015) —
unnecessary here: every allowlisted directory is already clean, so `error` costs nothing and
gives a hard regression gate.
