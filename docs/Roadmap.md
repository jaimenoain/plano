**Problem 1 — `FeedActivityCard` never fires in practice**

The code path is correct, but Rule 0 requires `!!review.building.main_image_url`. The diagnostic confirms `useFeed.ts` maps `review.building_data?.main_image_url || null`. However, **the `get_feed` PostgreSQL RPC almost certainly doesn't include `main_image_url` in the `building_data` JSON it returns** — it predates this phase. So `building_data.main_image_url` is always `undefined`, mapping to `null`, Rule 0 never fires, and every activity entry falls through to compact or cluster. The hook mapping is correct; the RPC SELECT is the gap.

**Problem 2 — `FeedClusterCard` is unbounded**

The cluster card is working correctly — it's grouping 16 pending entries from the same user into one card. But the component renders every entry as a bullet point with no cap. Nothing in Phase 7 changed `FeedClusterCard`, so this is pre-existing behaviour that the redesign has now made more visible.

---

## Targeted fix queue

### [x] FIX-1 — Add `main_image_url` to the `get_feed` RPC

**Files:** `supabase/migrations/YYYYMMDDHHMMSS_get_feed_add_main_image_url.sql` (new migration)

- Open the existing `get_feed` PostgreSQL function definition (find it by querying `pg_proc` in the Supabase SQL Editor: `SELECT prosrc FROM pg_proc WHERE proname = 'get_feed'`).
- Locate the `building_data` JSON construction inside the function. It will be a `json_build_object(...)` or `row_to_json(...)` call selecting fields from the `buildings` table.
- Add `'main_image_url', b.main_image_url` to that object, where `b` is the alias for the `buildings` join.
- Write this as a `CREATE OR REPLACE FUNCTION` migration — do not drop and recreate; preserve all existing parameters, return type, RLS, and grants.
- Apply via Supabase SQL Editor. After applying, verify by calling the RPC directly in the SQL Editor and confirming `building_data` in the returned JSON contains `main_image_url`.

**Verify:** `SELECT get_feed(10, 0)` in the SQL Editor returns rows where `building_data->>'main_image_url'` is a non-null string for at least some buildings. Reload the app feed and confirm `FeedActivityCard` now renders for visited/pending entries that have a building hero photo.

**Dependencies:** None.

---

### [ ] FIX-2 — Cap `FeedClusterCard` at 3 visible items with a count overflow

**Files:** `src/features/feed/components/FeedClusterCard.tsx` only.

- Find where the component renders the list of building names. It currently maps all `entries` with no limit.
- Slice the display list to a maximum of 3 entries: `const visible = entries.slice(0, 3)` and `const overflow = entries.length - 3`.
- Render the 3 visible building names, then if `overflow > 0` render a single trailing line: `"and {overflow} more"` in `text-text-secondary text-sm` — no bullet, no bold.
- Do not change any other aspect of the card layout, header, or action bar. This is a single-line logic change plus one conditional render.

**Verify:** A cluster with 16 entries shows 3 names and "and 13 more". A cluster with 2 entries shows both names and no overflow line. The card height is predictable regardless of cluster size.

**Dependencies:** None — independent of FIX-1.
