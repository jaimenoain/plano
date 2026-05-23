-- Migration: Ambassador building research queue
--
-- Implements the pre-filled AI research queue for the Embassy Contribute page.
-- Instead of ambassadors manually triggering "Research with AI" per building,
-- a background job (POST /api/embassy/research-queue) populates this table with
-- up to 10 pre-researched buildings, ready for the ambassador to review.
--
-- New table:  ambassador_building_research_queue
-- New RPCs:   get_ambassador_research_queue
--             get_ambassador_research_queue_candidates
--             ambassador_dismiss_queued_research
--
-- Feedback id: 4b3489a0-6d69-424b-a8c3-b6a8c7446258

-- ─────────────────────────────────────────────
-- 1.  Table
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ambassador_building_research_queue (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      uuid        NOT NULL REFERENCES public.ambassador_chapters(id) ON DELETE CASCADE,
  building_id     uuid        NOT NULL REFERENCES public.buildings(id)           ON DELETE CASCADE,
  building_name   text        NOT NULL,
  data_points     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  current_values  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'applied', 'dismissed')),
  researched_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_by     uuid        REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  UNIQUE (chapter_id, building_id)
);

CREATE INDEX IF NOT EXISTS idx_research_queue_chapter_status
  ON public.ambassador_building_research_queue (chapter_id, status, researched_at ASC);

-- ─────────────────────────────────────────────
-- 2.  RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.ambassador_building_research_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors can view chapter research queue"
  ON public.ambassador_building_research_queue
  FOR SELECT
  USING (public._ambassador_can_access_chapter(chapter_id));

CREATE POLICY "Ambassadors can insert into chapter research queue"
  ON public.ambassador_building_research_queue
  FOR INSERT
  WITH CHECK (public._ambassador_can_access_chapter(chapter_id));

CREATE POLICY "Ambassadors can update chapter research queue"
  ON public.ambassador_building_research_queue
  FOR UPDATE
  USING (public._ambassador_can_access_chapter(chapter_id));

CREATE POLICY "Admins can manage research queue"
  ON public.ambassador_building_research_queue
  FOR ALL
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.ambassador_building_research_queue TO authenticated;

-- ─────────────────────────────────────────────
-- 3.  RPC: get_ambassador_research_queue
--     Returns pending items for the ambassador's chapter, oldest first.
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ambassador_research_queue(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 10
)
RETURNS TABLE (
  id             uuid,
  building_id    uuid,
  building_name  text,
  data_points    jsonb,
  current_values jsonb,
  status         text,
  researched_at  timestamptz
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
  SELECT
    q.id,
    q.building_id,
    q.building_name,
    q.data_points,
    q.current_values,
    q.status,
    q.researched_at
  FROM public.ambassador_building_research_queue q
  WHERE q.chapter_id = p_chapter_id
    AND q.status = 'pending'
  ORDER BY q.researched_at ASC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_research_queue(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_research_queue(uuid, integer) TO authenticated;

-- ─────────────────────────────────────────────
-- 4.  RPC: get_ambassador_research_queue_candidates
--     Returns buildings needing AI research, excluding already-queued
--     buildings and buildings that have already been AI-researched.
--     Returns current field values so the route can snapshot them.
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ambassador_research_queue_candidates(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 10
)
RETURNS TABLE (
  id                   uuid,
  name                 text,
  address              text,
  city                 text,
  country              text,
  popularity_score     double precision,
  current_year_completed  integer,
  current_status          text,
  current_alt_name        text,
  current_access_level    text,
  current_access_logistics text,
  current_access_cost     text,
  current_access_notes    text,
  current_size_sqm        numeric,
  current_height_m        numeric,
  current_storeys         integer,
  current_category_name   text,
  typologies_count        bigint,
  style_count             bigint,
  materiality_count       bigint,
  context_count           bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_style_group_id       uuid;
  v_materiality_group_id uuid;
  v_context_group_id     uuid;
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;

  SELECT id INTO v_style_group_id       FROM attribute_groups WHERE slug = 'style'       LIMIT 1;
  SELECT id INTO v_materiality_group_id FROM attribute_groups WHERE slug = 'materiality'  LIMIT 1;
  SELECT id INTO v_context_group_id     FROM attribute_groups WHERE slug = 'context'      LIMIT 1;

  RETURN QUERY
  SELECT
    b.id,
    b.name::text,
    b.address::text,
    b.city::text,
    b.country::text,
    b.popularity_score::double precision,
    -- current scalar field values
    b.year_completed,
    b.status::text,
    b.alt_name::text,
    b.access_level::text,
    b.access_logistics::text,
    b.access_cost::text,
    b.access_notes::text,
    b.size_sqm,
    b.height_m,
    b.storeys,
    -- current category name
    (SELECT fc.name FROM functional_categories fc WHERE fc.id = b.functional_category_id)::text,
    -- current array field counts
    (SELECT COUNT(*) FROM building_functional_typologies bft WHERE bft.building_id = b.id),
    (SELECT COUNT(*)
       FROM building_attributes ba
       JOIN attributes a ON a.id = ba.attribute_id
      WHERE ba.building_id = b.id
        AND a.group_id = v_style_group_id),
    (SELECT COUNT(*)
       FROM building_attributes ba
       JOIN attributes a ON a.id = ba.attribute_id
      WHERE ba.building_id = b.id
        AND a.group_id = v_materiality_group_id),
    (SELECT COUNT(*)
       FROM building_attributes ba
       JOIN attributes a ON a.id = ba.attribute_id
      WHERE ba.building_id = b.id
        AND a.group_id = v_context_group_id)
  FROM public.buildings b
  WHERE
    -- in chapter geographic scope
    public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
    -- has at least one missing field
    AND (
      b.year_completed IS NULL
      OR NOT EXISTS (SELECT 1 FROM building_styles bs WHERE bs.building_id = b.id)
      OR NOT EXISTS (
        SELECT 1 FROM building_credits bc
         WHERE bc.building_id = b.id
           AND bc.status IN ('active', 'verified')
           AND bc.credit_tier = 'primary'
           AND bc.role = 'design_architecture'
      )
    )
    -- not already in the research queue for this chapter (any status)
    AND NOT EXISTS (
      SELECT 1 FROM ambassador_building_research_queue q
       WHERE q.building_id = b.id
         AND q.chapter_id = p_chapter_id
    )
    -- not already AI-researched (operation recorded in audit log)
    AND NOT EXISTS (
      SELECT 1 FROM building_audit_logs al
       WHERE al.building_id = b.id
         AND al.operation = 'ai_research_apply'
    )
  ORDER BY b.popularity_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_research_queue_candidates(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_research_queue_candidates(uuid, integer) TO authenticated;

-- ─────────────────────────────────────────────
-- 5.  RPC: ambassador_dismiss_queued_research
--     Marks a queue item as dismissed (ambassador skips it permanently).
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_dismiss_queued_research(
  p_queue_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  SELECT chapter_id INTO v_chapter_id
    FROM ambassador_building_research_queue
   WHERE id = p_queue_id;

  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'queue_item_not_found'
      USING HINT = 'Research queue item does not exist';
  END IF;

  IF NOT public._ambassador_can_access_chapter(v_chapter_id) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Not an active ambassador for this chapter';
  END IF;

  UPDATE public.ambassador_building_research_queue
     SET status      = 'dismissed',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE id = p_queue_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_dismiss_queued_research(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_dismiss_queued_research(uuid) TO authenticated;

COMMENT ON TABLE public.ambassador_building_research_queue IS
  'Pre-filled AI research results waiting for ambassador review.
   The background route /api/embassy/research-queue keeps this table
   populated with up to 10 pending items per chapter.
   Buildings that have been AI-researched before (any status) are excluded
   from automatic re-research.';
