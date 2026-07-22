# 0017 — Gitleaks secret scan on every PR

**Status:** accepted (mechanism live since the CI secret-scan job; recorded retroactively 2026-07-23)

**Context.** plano ships to production unattended (auto-merge on green, ADR-0005), so a secret
committed by mistake would reach `main` with no human in the loop to catch it. A blocking,
deterministic scan on every PR is exactly the kind of "boring gate" the charter wants
(principle 5). This is the "gitleaks secret scan" the principles audit lists among the required
PR checks (`docs/specs/principles-alignment.md` §5) and among the enforced-but-undocumented
mechanisms (§11 gap (d)).

**Decision.** The `secret-scan` job in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (lines ~123–137) runs
**gitleaks** with its default ruleset over the checked-out tree:
`gitleaks dir . --no-banner --redact --exit-code 1` — any finding fails the build. The binary is
**pinned to v8.30.1 and its download is sha256-checksum-verified** before use, so the gate can't
be silently swapped or a compromised release pulled. Pre-existing findings are frozen in
[`.gitleaksignore`](../../.gitleaksignore) — a small reviewed baseline of false positives
(design-sync cache hex keys, generated repomix snapshots that embedded an already-burned test
password). The load-bearing policy lives in that file and is non-negotiable: **never add a new
fingerprint to silence a finding — remove the secret from the file and rotate it; entries here
may only be deleted.** New leaks therefore cannot be waved through; the ignore file only shrinks.

**Rejected alternative.** GitHub's built-in push-protection / secret scanning alone — rejected:
it covers a fixed provider set and isn't a repo-owned, PR-blocking gate the same way. An
unpinned `latest` gitleaks or a marketplace action — rejected: pinning + checksum keeps the
supply chain of the gate itself boring and auditable. Allowing findings to be silenced by
fingerprint — rejected: that turns the gate into a rubber stamp and lets rotated-but-not-removed
secrets linger.
