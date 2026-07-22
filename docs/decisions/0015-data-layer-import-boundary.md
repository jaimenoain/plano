# 0015 — Data-layer import boundary (ESLint)

**Status:** accepted (mechanism live since Phase 1 guardrails; recorded retroactively 2026-07-23)

**Context.** plano is a vertical-slice codebase (`.cursor/rules/05-vertical-slice.mdc`) where
data access belongs in a feature's `api/` module or a route loader, not scattered through
components and hooks (`.cursor/rules/02-api.mdc`). Two drifts erode that: importing the Supabase
browser client (`@/integrations/supabase/client`) directly into UI, and reaching into another
feature's internals instead of its public barrel. Both were live in the tree — an audited
backlog of **163 direct-client imports and 939 deep cross-feature imports** — with nothing to
stop new ones. This is the "data-layer import boundary" the principles audit flagged as an
enforced-but-undocumented mechanism (`docs/specs/principles-alignment.md` §11 gap (d)).

**Decision.** [`eslint.config.js`](../../eslint.config.js) enforces the boundary with
`no-restricted-imports` (lines ~76–101): the two `client` specifiers are banned outside their
legitimate homes, and the pattern `^[@~]/features/[^/]+/(?!(index|api)(/|$)).+` bans deep
cross-feature imports (import from `@/features/<feature>` or its `api/` instead). A scoped
override (lines ~104–115) turns the rule **off** exactly where these imports are correct:
`src/features/*/api/**`, `src/**/*.loader.ts`, and `src/integrations/supabase/client.ts`
itself. The rule is deliberately **`warn`, not `error`**: with a backlog that large, erroring
would break the build, so it gates review and new code while the backlog burns down
per-directory. The warning count cannot silently grow — it is frozen by the warning ratchet
([`scripts/check-eslint-ratchet.mjs`](../../scripts/check-eslint-ratchet.mjs) against
`.eslint-warning-baseline.json`, an improve-only baseline per ADR-0003). Once a directory is
clean it can move to `error`.

**Rejected alternative.** Erroring immediately — rejected: it would either fail CI on 1,100+
pre-existing sites or force a big-bang refactor, both against the ratchets-over-big-bang posture
(ADR-0003). A hand-policed convention in the cursor rules with no lint — rejected: undetectable
drift is exactly the memory a future maintainer can't recover from the code (principles 10, 11).
