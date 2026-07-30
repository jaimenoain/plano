# 0022 — A building merge must always leave exactly one live survivor

**Status:** accepted (2026-07-30)

**Context.** "Farnsworth House" — the first building ever added to the catalogue — returned zero
results on `/search`. It was not a search bug. The catalogue held two Farnsworth rows, and
`admin_audit_logs` showed the same admin merging them **twice, in opposite directions**: on
2026-02-03 short_id 3745 → 3342, then on 2026-02-19 short_id 3342 → 3745. The second merge absorbed
a record *into an already-deleted one*, so both rows ended up `is_deleted = true` pointing at each
other. Since `search_buildings_v2` and `get_map_clusters_v3` both filter `is_deleted`, the building
vanished from every surface at once while all of its content — 2 notes, 1 credit, 1 style, 5
attributes — still hung off 3745.

`merge_buildings` allowed this because it validated only `source <> target` and that both rows
exist. It also re-pointed just four of the fourteen tables that reference `buildings.id`, so which
content survived a merge depended on the direction it happened to be run in.

**Decision.** Merges are governed by three invariants, enforced in
`merge_buildings` ([20271191000000](../../supabase/migrations/20271191000000_harden_merge_buildings.sql)) and
restored in the historical data by
[20271190000000](../../supabase/migrations/20271190000000_repair_orphaned_merge_chains.sql):

- **I1** — `merged_into_id IS NOT NULL` implies `is_deleted = true`. A live building never carries a
  pointer.
- **I2** — `merged_into_id` resolves to a **live** row in **one hop**. Every merge re-points inbound
  pointers at the new target, so chains stay flat.
- **I3** — every merge component has exactly one live survivor, and that survivor owns all dependent
  content.

Under I1 a cycle becomes structurally impossible: the target is always a chain root and the source
always becomes a leaf. The guards take both rows `FOR UPDATE` in a stable id order, so two admins
merging the same pair in opposite directions serialise rather than race.

I2 is load-bearing, not cosmetic. [`BuildingDetails.loader.ts`](../../src/features/buildings/pages/BuildingDetails.loader.ts)
301s a merged building to its survivor with a **single** lookup and no loop, which is only safe
because chains are flat. `scripts/verify_merge_chains.sql` is the check for all three.

Consequences we accept:

- **Merging stays open to every authenticated user.** `merge_buildings` is `SECURITY DEFINER` with
  `EXECUTE` granted to `anon`, `authenticated` and `service_role` and no permission check in its
  body — a deliberate choice in `20261118000000_allow_all_users_merge_buildings.sql`, reaffirmed by
  the owner while fixing this incident, because ambassadors merge duplicates from
  `/embassy/contribute`. The new guards stop the *accidental* circular merge; they do not stop
  deliberate misuse, and any signed-in user can still soft-delete a building. Anonymous callers
  cannot in practice: `admin_audit_logs.admin_id` is `NOT NULL`, so a merge with a NULL `auth.uid()`
  aborts on the audit insert at the end of the transaction. Narrowing this to "admins plus
  ambassadors scoped to their chapter" is deferred; it needs two product answers (may ambassadors
  merge or only propose, and must both buildings sit in their chapter?).
- **Merged rows stay readable.** `buildings` RLS is `USING (true)` and nothing filters `is_deleted`
  on read, so a merged row still resolves by slug. The loader redirect is what makes that harmless.

**Rejected alternatives.**

- *A `CHECK` constraint or trigger enforcing acyclicity.* Rejected: reachability is not expressible
  in a row-level `CHECK`, and a trigger raising `23514` cannot tell the admin *which* record to
  merge into instead — the guards' messages name the surviving building's `short_id`.
- *Hard-delete the source instead of soft-deleting it.* Rejected: `merged_into_id` is what lets old
  and shared URLs 301 to the survivor, and every FK to `buildings.id` would need an explicit
  cascade decision. The soft delete is the redirect's data source.
- *Filter `is_deleted` in the building detail loader and 404 merged rows.* Rejected: it turns 112
  live URLs — and every future merge — into dead ends, losing the inbound links and search equity
  that made merging worthwhile.
- *Resurrect the newest row in a broken component.* Rejected in favour of ranking by dependent-row
  count, then popularity, then verification, then age. Content is the only thing a merge can
  destroy; popularity and verification are recoverable. For the Farnsworth pair this picked 3745
  (11 dependent rows to 3342's zero) — which is also the row the last merge had intended to keep.
