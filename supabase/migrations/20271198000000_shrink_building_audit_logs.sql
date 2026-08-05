-- Shrink building_audit_logs from full-row snapshots to per-column deltas.
--
-- types-neutral: no table, column, or RPC signature changes — this replaces the
-- bodies of log_building_changes() and revert_building_change() and adds one
-- helper function. building_audit_logs keeps its exact column list.
--
-- WHY
-- ---
-- `log_building_changes()` stored `to_jsonb(OLD)` AND `to_jsonb(NEW)` — two
-- complete copies of the buildings row — on every UPDATE. That payload includes
-- `search_vector`, a weighted tsvector built from name + aliases + address +
-- architect_statement, which is by far the largest column on the table. The
-- result was the single biggest consumer of database storage and it pushed the
-- project past its Supabase quota (1.28 GB of 1.1 GB, August 2026).
--
-- Two compounding faults:
--
--   1. Full snapshots. Every audit row carried ~every byte of the building twice,
--      overwhelmingly `search_vector`, which nothing has ever read back.
--   2. `NEW IS DISTINCT FROM OLD` fired on machine-maintained churn. The nightly
--      pg_cron job `update-building-tiers-daily` rewrites `tier_rank` across the
--      catalogue, and `search_vector` / `updated_at` / `popularity_score` all move
--      without a human editing anything. Each such row wrote a full double
--      snapshot describing an edit nobody made.
--
-- WHAT CHANGES
-- ------------
-- Both `old_data` and `new_data` are reduced to only the keys that actually
-- differ, minus a denylist of machine-maintained columns. When that reduces to
-- nothing, no audit row is written at all — which is what stops the nightly tier
-- job from generating history.
--
-- WHAT DELIBERATELY DOES NOT CHANGE
-- ---------------------------------
-- `building_audit_logs` is not only an audit trail; it is the substrate for the
-- entire Embassy/ambassador contribution system (43 migrations read it). In
-- particular six leaderboard/metric RPCs detect a photo contribution with:
--
--     old_data ->> 'hero_image_url' IS (effectively) NULL
--     AND new_data ->> 'hero_image_url' IS NOT NULL
--
-- Delta encoding preserves that predicate exactly — when hero_image_url changes
-- it is a differing key, so it stays in both payloads; when it does not change it
-- is absent from both and `->>` yields NULL, which correctly fails the second leg.
-- `hero_image_url` MUST therefore never join the denylist below. Neither may
-- `operation` or `table_name`, which carry the ambassador approval markers
-- (see 20271196000000 and ADR 0028).

-- ---------------------------------------------------------------------------
-- 1. The denylist, as a function so the trigger and the backfill cannot drift
-- ---------------------------------------------------------------------------
-- Machine-maintained columns only. Adding anything a human can edit here would
-- silently erase it from the edit history; adding `hero_image_url` would zero out
-- every ambassador's photo contribution stat.
CREATE OR REPLACE FUNCTION public.building_audit_ignored_columns()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ARRAY[
    'search_vector',     -- the tsvector; the bulk of the old payload, never read back
    'updated_at',        -- touched by every write
    'popularity_score',  -- recomputed from engagement
    'tier_rank'          -- rewritten nightly by update_building_tiers()
  ]::text[];
$$;

COMMENT ON FUNCTION public.building_audit_ignored_columns() IS
  'Columns excluded from building_audit_logs payloads because they are maintained '
  'by machines, not people. Never add hero_image_url — the Embassy leaderboards '
  'detect photo contributions by diffing it across old_data/new_data.';

-- ---------------------------------------------------------------------------
-- 2. Reduce one payload against its counterpart
-- ---------------------------------------------------------------------------
-- Keeps the keys of p_subject that differ from p_other, minus the denylist.
--
-- When p_other IS NULL the whole of p_subject is kept (minus the denylist): rows
-- written directly by the moderation RPCs carry only `new_data`, holding a small
-- hand-built object like {'moderated_at':…, 'moderated_by':…} rather than a row
-- snapshot. Those must survive the backfill untouched.
CREATE OR REPLACE FUNCTION public.building_audit_reduce(p_subject jsonb, p_other jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_subject IS NULL THEN NULL
    ELSE COALESCE(
      (
        SELECT jsonb_object_agg(k, p_subject -> k)
        FROM jsonb_object_keys(p_subject) AS k
        WHERE  k <> ALL (public.building_audit_ignored_columns())
          AND (p_other IS NULL OR (p_subject -> k) IS DISTINCT FROM (p_other -> k))
      ),
      '{}'::jsonb
    )
  END;
$$;

COMMENT ON FUNCTION public.building_audit_reduce(jsonb, jsonb) IS
  'Reduces a building_audit_logs payload to the keys that differ from its '
  'counterpart, dropping machine-maintained columns. NULL in, NULL out.';

-- ---------------------------------------------------------------------------
-- 3. The trigger: log deltas, and log nothing when only machines changed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_building_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_old     JSONB;
    v_new     JSONB;
    v_changed TEXT[];
BEGIN
    v_user_id := auth.uid();

    IF TG_TABLE_NAME = 'buildings' AND TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);

        SELECT array_agg(k)
        INTO   v_changed
        FROM   jsonb_object_keys(v_new) AS k
        WHERE  k <> ALL (public.building_audit_ignored_columns())
          AND (v_old -> k) IS DISTINCT FROM (v_new -> k);

        -- Nothing a person changed. The nightly tier job and search_vector
        -- refreshes land here and write no history at all.
        IF v_changed IS NULL THEN
            RETURN NEW;
        END IF;

        INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, old_data, new_data)
        VALUES (
            NEW.id,
            v_user_id,
            'buildings',
            'UPDATE',
            (SELECT jsonb_object_agg(k, v_old -> k) FROM unnest(v_changed) AS k),
            (SELECT jsonb_object_agg(k, v_new -> k) FROM unnest(v_changed) AS k)
        );
        RETURN NEW;

    -- building_styles rows are two columns wide; snapshots are already tiny.
    ELSIF TG_TABLE_NAME = 'building_styles' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, new_data)
            VALUES (NEW.building_id, v_user_id, 'building_styles', 'INSERT', to_jsonb(NEW));
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, old_data)
            VALUES (OLD.building_id, v_user_id, 'building_styles', 'DELETE', to_jsonb(OLD));
            RETURN OLD;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Triggers are unchanged, but re-assert them so a partially-applied history
-- cannot leave the table without an audit trail.
DROP TRIGGER IF EXISTS audit_buildings_update ON buildings;
CREATE TRIGGER audit_buildings_update
    AFTER UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION public.log_building_changes();

DROP TRIGGER IF EXISTS audit_building_styles_change ON building_styles;
CREATE TRIGGER audit_building_styles_change
    AFTER INSERT OR DELETE ON building_styles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_building_changes();

-- ---------------------------------------------------------------------------
-- 4. revert_building_change: survive a partial old_data
-- ---------------------------------------------------------------------------
-- The previous body assumed old_data held every column and assigned all of them
-- unconditionally:
--
--     SET name = (r.old_data->>'name'), address = (r.old_data->>'address'), …
--         location = (r.old_data->>'location')::geography
--
-- Against a delta that is data loss, not a revert: any column absent from the
-- payload would be assigned NULL — a revert of a name typo would wipe the
-- building's address, city, year and coordinates. Each column is now restored
-- only when the payload actually carries that key (`?`, key-exists — not
-- COALESCE, which cannot distinguish "absent" from "was legitimately NULL").
CREATE OR REPLACE FUNCTION public.revert_building_change(log_id UUID)
RETURNS VOID AS $$
DECLARE
    r building_audit_logs%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can revert changes';
    END IF;

    SELECT * INTO r FROM building_audit_logs WHERE id = log_id;

    IF r.id IS NULL THEN
        RAISE EXCEPTION 'Log entry not found';
    END IF;

    IF r.table_name = 'buildings' AND r.operation = 'UPDATE' THEN
        IF r.old_data IS NULL OR r.old_data = '{}'::jsonb THEN
            RAISE EXCEPTION 'Log entry % carries no previous values to restore', log_id;
        END IF;

        UPDATE buildings b
        SET
            name = CASE WHEN r.old_data ? 'name'
                        THEN (r.old_data ->> 'name') ELSE b.name END,
            address = CASE WHEN r.old_data ? 'address'
                        THEN (r.old_data ->> 'address') ELSE b.address END,
            city = CASE WHEN r.old_data ? 'city'
                        THEN (r.old_data ->> 'city') ELSE b.city END,
            country = CASE WHEN r.old_data ? 'country'
                        THEN (r.old_data ->> 'country') ELSE b.country END,
            year_completed = CASE WHEN r.old_data ? 'year_completed'
                        THEN (r.old_data ->> 'year_completed')::int ELSE b.year_completed END,
            location = CASE WHEN r.old_data ? 'location'
                        THEN (r.old_data ->> 'location')::geography ELSE b.location END,
            location_precision = CASE WHEN r.old_data ? 'location_precision'
                        THEN (r.old_data ->> 'location_precision')::location_precision
                        ELSE b.location_precision END
        WHERE b.id = r.building_id;

    ELSIF r.table_name = 'building_styles' THEN
        IF r.operation = 'INSERT' THEN
            DELETE FROM building_styles
            WHERE building_id = (r.new_data ->> 'building_id')::uuid
              AND style_id = (r.new_data ->> 'style_id')::uuid;
        ELSIF r.operation = 'DELETE' THEN
            INSERT INTO building_styles (building_id, style_id)
            VALUES (
                (r.old_data ->> 'building_id')::uuid,
                (r.old_data ->> 'style_id')::uuid
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------
-- Helpers are read-only and called from SECURITY DEFINER bodies; keep them off
-- the public API surface (per ADR 0025 / migration 20271172000000's revocations).
REVOKE ALL ON FUNCTION public.building_audit_ignored_columns () FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.building_audit_reduce (jsonb, jsonb) FROM PUBLIC, anon, authenticated;
