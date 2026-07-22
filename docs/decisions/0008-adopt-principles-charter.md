# 0008 — Adopt the operating-principles charter

**Status:** accepted (2026-07-22) — fleet-wide policy, template ADR-0036

**Context.** The owner maintains one canonical operating-principles charter — 11 principles describing how every one of their projects is run — in the template repo. It was copied verbatim into this repo at [`docs/PRINCIPLES.md`](../PRINCIPLES.md) but never formally adopted, so nothing recorded its standing relative to plano's own ADRs and rules, and nothing checked whether plano actually satisfies it. The charter's own "In practice" pointers cite the *template's* ADR numbering (0014–0036), which does not match plano's independent 0001–0007 sequence, leaving all of its ADR cross-references dangling.

**Decision.** Plano adopts [`docs/PRINCIPLES.md`](../PRINCIPLES.md) as its charter: it sits **above** the ADRs and `.cursor/rules/`, stating *why* the factory is built the way it is. The layer model holds — charter says why, ADRs say what was decided, rules say how to act, CI enforces. A change that serves no principle, or fights one, needs the owner's explicit business sign-off; changing a principle itself requires a superseding ADR.

The charter text is adopted **unmodified**. Because plano's ADR numbering is independent of the template's, the charter's ADR citations are **not** renumbered here; they are reconciled by the alignment roadmap. The full gap analysis of every principle against plano's reality, and the queued remediation roadmap, live in [`docs/specs/principles-alignment.md`](../specs/principles-alignment.md). Adopting the charter does not itself change any runtime, CI, or repo-settings behavior — each gap is closed by its own later PR through the normal flow.

Adoption is immediate for the principles plano already satisfies. Principles 7 (data safety), 8 (production watching), and 9 (self-repair) are adopted **ahead of full implementation**, which lands via the alignment roadmap — mirroring how the template adopted them in its ADR-0036.

**Rejected alternative.** Renumbering plano's ADRs to match the template's so the charter's citations resolve directly: rejected — ADRs are never rewritten after acceptance (this repo's README rule and ADR-0002's spirit), renumbering would break every existing inbound link, and a crosswalk in the alignment spec resolves the references at far lower risk.
