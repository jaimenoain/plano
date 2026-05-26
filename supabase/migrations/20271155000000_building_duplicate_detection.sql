-- Building duplicate detection for the ambassador workspace.
-- Feedback id: 570af7a4-5e67-4c3c-9749-9ac767f19be2
--
-- Adds:
--   1. building_duplicate_dismissals — per-user "not a duplicate" decisions.
--   2. get_potential_duplicate_buildings(p_chapter_id, p_limit) — chapter-scoped
--      auto-suggestion using a fixed 0.75 trigram threshold, excluding dismissed pairs.
--   3. dismiss_building_duplicate_pair(p_id1, p_id2) — records a dismissal.

-- ── 1. Dismissals table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.building_duplicate_dismissals (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  building_id_1 uuid        NOT NULL REFERENCES public.buildings (id) ON DELETE CASCADE,
  building_id_2 uuid        NOT NULL REFERENCES public.buildings (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdd_ordered_pair   CHECK (building_id_1 < building_id_2),
  CONSTRAINT bdd_unique_pair    UNIQUE (user_id, building_id_1, building_id_2)
);

CREATE INDEX IF NOT EXISTS bdd_user_pair_idx
  ON public.building_duplicate_dismissals (user_id, building_id_1, building_id_2);

ALTER TABLE public.building_duplicate_dismissals ENABLE ROW LEVEL SECURITY;

-- Ambassadors can only see and create their own dismissals.
CREATE POLICY "bdd_select_own"
  ON public.building_duplicate_dismissals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "bdd_insert_own"
  ON public.building_duplicate_dismissals FOR INSERT
  WITH CHECK (user_id = auth.uid());

GRANT INSERT, SELECT ON public.building_duplicate_dismissals TO authenticated;

-- ── 2. Suggestion RPC ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_potential_duplicate_buildings(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 20
)
RETURNS TABLE (
  id1   uuid,
  name1 text,
  id2   uuid,
  name2 text,
  score float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH chapter AS (
    SELECT c.type, c.locality_id, c.country_code
    FROM   ambassador_chapters c
    WHERE  c.id = p_chapter_id
  ),
  scoped_buildings AS (
    SELECT b.id, b.name
    FROM   buildings b, chapter c
    WHERE  COALESCE(b.is_deleted, FALSE) = FALSE
      AND  (
        (c.type = 'local'
           AND b.locality_id IS NOT NULL
           AND b.locality_id = c.locality_id)
        OR
        (c.type = 'national'
           AND (
             upper(COALESCE(b.country_code, '')) = c.country_code
             OR EXISTS (
               SELECT 1
               FROM   localities l
               WHERE  l.id = b.locality_id
                 AND  upper(l.country_code) = c.country_code
             )
           )
        )
      )
  )
  SELECT
    b1.id        AS id1,
    b1.name      AS name1,
    b2.id        AS id2,
    b2.name      AS name2,
    similarity(b1.name, b2.name)::float AS score
  FROM scoped_buildings b1
  JOIN scoped_buildings b2 ON b1.id < b2.id
  WHERE similarity(b1.name, b2.name) > 0.75
    AND NOT EXISTS (
      SELECT 1
      FROM   building_duplicate_dismissals d
      WHERE  d.user_id       = auth.uid()
        AND  d.building_id_1 = b1.id
        AND  d.building_id_2 = b2.id
    )
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL  ON FUNCTION public.get_potential_duplicate_buildings(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_potential_duplicate_buildings(uuid, integer) TO authenticated;

-- ── 3. Dismissal RPC ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.dismiss_building_duplicate_pair(
  p_id1 uuid,
  p_id2 uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lo uuid := LEAST(p_id1, p_id2);
  v_hi uuid := GREATEST(p_id1, p_id2);
BEGIN
  INSERT INTO building_duplicate_dismissals (user_id, building_id_1, building_id_2)
  VALUES (auth.uid(), v_lo, v_hi)
  ON CONFLICT (user_id, building_id_1, building_id_2) DO NOTHING;
END;
$$;

REVOKE ALL  ON FUNCTION public.dismiss_building_duplicate_pair(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dismiss_building_duplicate_pair(uuid, uuid) TO authenticated;
