# Playbooks

One file per recurring operational failure: a known symptom and the verified
steps to diagnose and fix it. Write one when you resolve an incident that will
plausibly happen again and the fix was non-obvious — the playbook is what turns
the second occurrence from an investigation into a checklist.

Not for decisions (those are ADRs in [`../decisions/`](../decisions/)), not for
project specs (top level of `docs/`), and not for one-time setup steps
(`../project_start/` or the root `README.md`).

Format, one file `short-symptom-slug.md`:

```markdown
# Playbook — <symptom as the user/agent sees it>

Use when: <the exact observable trigger>.

## Quick check

<How to confirm this playbook applies, in 1–3 steps.>

## Fix

<Numbered, verified steps.>
```

If a Cursor rule covers the same ground (e.g. `.cursor/rules/07-vercel-deployments.mdc`),
link it from the playbook and keep the rule authoritative for conduct; the
playbook holds the step-by-step recovery detail.
