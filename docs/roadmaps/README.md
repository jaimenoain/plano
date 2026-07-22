# Completed Roadmaps — the Delivery Archive

`docs/ROADMAP.md` holds exactly **one active roadmap** at a time. When every task in it is
`[x]`, the executor's close-out routine (`docs/EXECUTOR_PROMPT.md` step 8) caps the finished
file with a single **Delivery Record** summary, moves it here, and resets `docs/ROADMAP.md`
to the blank scaffold below, ready for the next roadmap to be generated per
`docs/project_start/04-writing-the-roadmap.md`.

Each archived file is the permanent delivery record of one roadmap: what shipped, what was
descoped, and which specs moved. That summary is written **once, at close-out** — there are
no per-phase summary tasks (spec-sync rides each task's Active Memory Update as the roadmap
runs). This folder is a **ledger, not a spec** — the agent never reads it to decide what
exists (that is `docs/AI_STATUS.md`) or what to build next (that is the active
`docs/ROADMAP.md`).

It is also a delivery archive, not a decisions record: an architectural choice made during a
roadmap still gets its own ADR in `docs/decisions/`, written at the moment the choice is made
— never one ADR per completed roadmap (see ADR 0016).

**Naming:** `NNNN-short-slug.md` — next free number, slug describing the roadmap's theme.
E.g. `0001-initial-build.md`, `0002-billing-and-invoicing.md`.

## Index

| #   | Roadmap                                                          | Completed  |
| --- | ---------------------------------------------------------------- | ---------- |
| [0001](0001-design-precision-programme.md) | Design Precision Programme — pixel-precision pass across all surfaces | 2026-07-22 |

## The reset scaffold

At close-out, after archiving, the executor replaces the **entire** contents of
`docs/ROADMAP.md` with exactly this block — no tasks, no sample content, nothing else:

```markdown
# Roadmap

> No active roadmap. The previous roadmap is archived in `docs/roadmaps/` (see its index).
> To plan the next body of work — a feature set, a fix round, an optimisation pass —
> generate a new roadmap into this file by following
> `docs/project_start/04-writing-the-roadmap.md` in **subsequent-roadmap mode**: the
> foundations are built; plan feature slices only.
```

**Guard:** the close-out routine runs only in a real project whose roadmap has genuinely
completed. It must never run against the template repository's own `docs/ROADMAP.md`, which
is a permanent illustrative sample.
