# 0031 — Editing a building credit is open to any signed-in member

**Status:** Accepted — 2026-08-05
**Context:** Roadmap Task 2.2 (UX Refinement Round), CSV ref #20

## Context

Any signed-in member could always *add* a credit — `building_credits_insert`
(20270822000000) accepts any authenticated user. Nobody could *correct* one. The
matching UPDATE policy admitted three principals only:

1. `is_admin()`
2. the user who claimed the credited **person**
3. a steward of the credited **company**

So the member who had just mistyped a credit could not fix it, and the building
page never offered an edit affordance at all. The owner reported this as "each
existing credit can be edited" being missing from the Credits tab.

Two facts made the narrow rule untenable:

- **The rest of the building record is already open.** `canEditOfficialData` is
  `!!user`: any member may rewrite a building's name, address, and year. Credits
  being the one locked field was an inconsistency, not a policy.
- **The credits most likely to be wrong have no author.** The bulk architect/firm
  import wrote `added_by_user_id IS NULL` across the catalogue (see
  `docs/AI_STATUS.md` on the misfiled import). Any rule keyed on authorship
  therefore leaves exactly the wrong rows unfixable.

## Decision

Extend `building_credits_update` with a fourth branch: **any authenticated user,
on rows whose `status = 'active'`** (migration `20271202000000`). The original
three principals are unchanged.

The open branch is bounded three ways:

- **Status.** `verified` was confirmed by the credited party; `flagged`/`hidden`
  is under moderation. Those stay with the original three. `WITH CHECK` pins the
  new row to `'active'` too, so the branch cannot be used to self-verify.
- **Entity.** `WITH CHECK` requires `person_id IS NOT NULL OR company_id IS NOT
  NULL`, an invariant the insert policy always had and UPDATE never did.
- **Provenance.** A `BEFORE UPDATE` trigger pins `building_id` and
  `added_by_user_id` against direct client writes. Moving a credit to another
  building is how you would silently strip a building of its architect, and no
  client path has ever needed it.

The trigger discriminates on `current_user`, not `auth.uid()`. Inside a
SECURITY DEFINER RPC — `flag_building_credit`, `redeem_credit_removal_token`,
`merge_buildings`, the ambassador approval batches — `auth.uid()` is still the
member who called it, so an `auth.uid()` guard would fire on the app's own
moderation flows. `current_user` is `authenticated` only for a direct PostgREST
write and becomes `postgres` inside those functions. The trigger function is
therefore SECURITY INVOKER on purpose; a SECURITY DEFINER one would report its
own owner and discriminate nothing.

Edits are logged to `admin_audit_logs` as `credit_edited`, a new entry in the
`entity_audit_logs_actor_insert` whitelist.

## Alternatives rejected

- **Author-only (`added_by_user_id = auth.uid()`), plus the existing three.**
  Safer on paper, useless in practice: the imported credits carry no author, so
  the rows most in need of correction would remain admin-only.
- **Leave the policy alone and show Edit only to the three principals.** Would
  satisfy the task's letter and none of its intent — the affordance would be
  invisible to essentially every user, and the Credits tab would look unchanged.
- **Column-level `GRANT UPDATE (…) TO authenticated` instead of the trigger.**
  Column privileges are checked against the current role, which is `authenticated`
  for admins too — it would have blocked the admin status changes that
  `updateCreditStatus` writes directly from the client.

## Consequences

- A member can correct a wrong architect from the Credits tab, including on
  imported rows. Vandalism is possible in the same way it already is for a
  building's name; every edit is attributable through `admin_audit_logs`.
- The rule is now stated twice — in SQL and in `canEditCredit`
  (`src/features/buildings/components/BuildingCredits.tsx`). Both are pinned by
  tests (`BuildingCredits.test.tsx`,
  `tests/unit/building-credits-member-edits-migration.test.ts`); they must move
  together.
- Credit deletion is untouched: still admin or the building's creator.
