# 0029 — Who saved or visited a building is visible to signed-in members

**Status:** accepted (2026-08-05) — supersedes the "no rating/visit aggregate is exposed" note in [`docs/DATA_CONTRACT.md`](../DATA_CONTRACT.md) and the same claim in the header of [`20271189000000_country_guide.sql`](../../supabase/migrations/20271189000000_country_guide.sql)

## Context

Roadmap Task 1.3 asks the building detail Overview tab to surface members who merely **saved** or
**visited** a building, not only those who reviewed it. Nothing on the page could do that, for two
compounding reasons.

**The Community stream structurally cannot hold a silent visit.** It is composed from
`get_building_reviews`, which is anchored on `building_posts` and filters out entries with no body,
tags, video or images. `buildStreamBlocks` then drops any block that has no photo, no text and no
video. A member who tapped "Visited" and wrote nothing produces no `building_posts` row at all, so
there is no object for the stream to render.

**RLS makes the underlying rows unreadable anyway.** The current SELECT policy on `user_buildings`
([`20270872000000_building_posts.sql`](../../supabase/migrations/20270872000000_building_posts.sql))
only exposes another member's row when that member *also* has a visible `building_posts` row for the
same building:

```sql
(select auth.uid()) = user_id
OR EXISTS (select 1 from public.building_posts bp
           where bp.user_id = user_buildings.user_id
             and bp.building_id = user_buildings.building_id
             and (coalesce(bp.visibility,'public') = 'public' or …))
```

That same migration **dropped the `visibility` column from `user_buildings`**, moving visibility onto
`building_posts`. So there is no per-row visibility flag left on the status table to relax, and a
plain client query returns the viewer's own row and nothing else — precisely the case the feature
exists to surface.

Worth naming plainly: this is not a new disclosure of a private fact. The same information is
**already reachable publicly, person-first**. `building_matches_contact_filters`
([`20271164000000`](../../supabase/migrations/20271164000000_filter_helpers_collections_contacts.sql))
is `SECURITY DEFINER` and backs the map/search `rated_by=@username` filter, which reveals exactly
which buildings a named member saved, visited or rated. The feed and the discovery cards show
save/visit activity too, scoped to the follow graph. What was missing was the building-first view of
facts the product already publishes.

## Decision

**Saved and visited activity for a building is readable by any signed-in member, through one
`SECURITY DEFINER` RPC — `get_building_activity`
([`20271201000000`](../../supabase/migrations/20271201000000_get_building_activity.sql)).**

The elevation is the mechanism, not an accident, and it is bounded three ways:

1. **`status = 'ignored'` never leaves the function.** A member's hidden list stays private, matching
   every other surface that has had to make this call: [`20261222000000`](../../supabase/migrations/20261222000000_fix_discovery_feed_skip.sql)
   excludes it from `save_count`, and [`20260910000000`](../../supabase/migrations/20260910000000_exclude_hidden_from_feed.sql)
   and [`20270517000000`](../../supabase/migrations/20270517000000_hide_hidden_in_map.sql) drop it
   from the feed and the map.
2. **`anon` holds no EXECUTE.** Naming members to logged-out visitors would publish a scrapeable
   roster; the client hook is disabled without a session, so the section simply does not render.
3. **The projection is fixed and narrow** — username, avatar, award, `visited_at`, and whether the
   viewer follows them. No note bodies, no private columns, no way to widen it from the client.

Ordering puts the viewer first, then members they follow, then the rest by award and recency, so the
capped list shows the most meaningful faces rather than the most recent ones.

### Alternatives rejected

- **Relax the RLS policy instead.** It would need a new `visibility` column on `user_buildings` to
  replace the one `20270872000000` dropped, plus a backfill, plus a settings surface for a preference
  nobody has asked for. A single narrow read path is the smaller change and keeps the exposure
  auditable in one place.
- **Aggregate counts only ("12 people saved this").** Still requires the same `SECURITY DEFINER`
  elevation, so it buys no safety — it only makes the section a statistic instead of a community
  signal. The owner chose named faces for both groups.
- **Scope to the viewer's follow graph**, as the feed and discovery cards do. Honest, but on a
  catalogue this size it leaves the section empty for almost every building and every member, which
  is the failure mode the task was raised to fix.

## Consequences

- `docs/DATA_CONTRACT.md` no longer claims `user_buildings` is fully private per member; it now
  documents this one member-visible read path and the `'ignored'` carve-out.
- Any future column added to `user_buildings` is **not** automatically exposed — the RPC projects
  named fields, so widening is a deliberate edit.
- `useBuildingDrawerData` still counts visitors with a client-side `count` under RLS, so the drawer's
  visitor number under-counts every silent visit. That is a pre-existing bug this ADR does not fix;
  the RPC is the obvious replacement when it is addressed.
