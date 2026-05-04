-- =============================================================================
-- Migration: note_views
-- Purpose:   Track who has seen ("viewed") each note (building_posts row).
--            A view is recorded when a note's summary is loaded into a feed for
--            an authenticated viewer other than the author.  The author can see
--            an aggregate view count on each of their notes.
--
-- Design:
--   - `note_views(note_id, viewer_id, created_at)` with composite PK so each
--      authenticated viewer is counted at most once per note (idempotent inserts
--      via ON CONFLICT DO NOTHING).
--   - `building_posts.views_count` denormalized counter, kept in sync by an
--      AFTER INSERT trigger.  Reads on the feed therefore stay a single column
--      lookup (no aggregate over note_views).
--   - `track_note_views(p_note_ids UUID[])` RPC is the only ingress for view
--      events.  SECURITY DEFINER so it can bypass note_views RLS while still
--      using the JWT's `auth.uid()` for both the row's `viewer_id` and the
--      "skip self-views" check.  Anonymous (`auth.uid() IS NULL`) callers are
--      a no-op so logged-out feed loads do not count.
-- =============================================================================

-- 1. Denormalized counter on building_posts
ALTER TABLE public.building_posts
  ADD COLUMN IF NOT EXISTS views_count BIGINT NOT NULL DEFAULT 0;

-- 2. note_views table
CREATE TABLE IF NOT EXISTS public.note_views (
  note_id    UUID        NOT NULL REFERENCES public.building_posts(id) ON DELETE CASCADE,
  viewer_id  UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_note_views_viewer_id  ON public.note_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_note_views_created_at ON public.note_views(created_at);

ALTER TABLE public.note_views ENABLE ROW LEVEL SECURITY;

-- Authors may read the raw view rows for their own notes.  Other users have no
-- direct read access; the public-facing aggregate is exposed via the
-- denormalized `building_posts.views_count` column.
CREATE POLICY "note_views_select_owner" ON public.note_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.building_posts bp
      WHERE bp.id = note_views.note_id
        AND bp.user_id = (SELECT auth.uid())
    )
  );

-- Direct INSERT is locked down: ingestion goes through the SECURITY DEFINER RPC
-- so we can centralize the self-view filter and batching.
REVOKE INSERT, UPDATE, DELETE ON public.note_views FROM authenticated, anon;

-- 3. Trigger to bump building_posts.views_count
CREATE OR REPLACE FUNCTION public.handle_note_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.building_posts
     SET views_count = views_count + 1
   WHERE id = NEW.note_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_note_views_increment ON public.note_views;
CREATE TRIGGER trg_note_views_increment
  AFTER INSERT ON public.note_views
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_note_views_count();

-- 4. RPC: track_note_views
--    Bulk-records views for the calling user.  Idempotent — repeat calls for
--    the same (note, viewer) pair are dropped by the PK conflict.  Self-views
--    are filtered server-side, so clients can't bump their own counts even by
--    crafting an arbitrary p_note_ids list.
CREATE OR REPLACE FUNCTION public.track_note_views(p_note_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL OR p_note_ids IS NULL OR array_length(p_note_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.note_views (note_id, viewer_id)
  SELECT bp.id, v_user_id
    FROM public.building_posts bp
   WHERE bp.id = ANY(p_note_ids)
     AND bp.user_id <> v_user_id
  ON CONFLICT (note_id, viewer_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_note_views(UUID[]) TO authenticated;

-- 5. Update get_feed to surface views_count
DROP FUNCTION IF EXISTS get_feed(INT, INT);
CREATE OR REPLACE FUNCTION get_feed(p_limit INT, p_offset INT)
RETURNS TABLE (
  id             UUID,
  content        TEXT,
  rating         INTEGER,
  tags           TEXT[],
  created_at     TIMESTAMPTZ,
  edited_at      TIMESTAMPTZ,
  status         TEXT,
  user_id        UUID,
  building_id    UUID,
  user_data      JSONB,
  building_data  JSONB,
  likes_count    BIGINT,
  comments_count BIGINT,
  views_count    BIGINT,
  is_liked       BOOLEAN,
  review_images  JSONB
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH feed_page AS (
    SELECT
      bp.id,
      bp.body        AS content,
      ub.rating,
      bp.tags,
      bp.created_at,
      bp.updated_at  AS edited_at,
      ub.status,
      bp.user_id,
      bp.building_id,
      bp.views_count,
      COALESCE(bp.updated_at, bp.created_at) AS sort_at
    FROM public.building_posts bp
    LEFT JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    WHERE
      (bp.user_id = v_user_id
       OR bp.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id))
      AND (ub.status IS NULL OR ub.status != 'ignored')
      AND (
        bp.user_id = v_user_id
        OR COALESCE(bp.visibility, 'public') = 'public'
        OR (
          bp.visibility = 'contacts'
          AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = v_user_id AND f.following_id = bp.user_id
          )
        )
      )
      AND (
        bp.body         IS NOT NULL
        OR bp.tags      IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
      )
    ORDER BY COALESCE(bp.updated_at, bp.created_at) DESC
    LIMIT p_limit OFFSET p_offset
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT fp_id.id FROM feed_page fp_id)
    GROUP BY l.interaction_id
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM public.comments c
    WHERE c.interaction_id IN (SELECT fp_id.id FROM feed_page fp_id)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT fp_id.id FROM feed_page fp_id)
      AND l.user_id = v_user_id
  ),
  images_agg AS (
    SELECT
      ri.review_id,
      jsonb_agg(
        jsonb_build_object(
          'id',           ri.id,
          'storage_path', ri.storage_path,
          'likes_count',  ri.likes_count,
          'is_liked',     (il.image_id IS NOT NULL)
        )
      ) AS imgs
    FROM public.review_images ri
    LEFT JOIN public.image_likes il ON il.image_id = ri.id AND il.user_id = v_user_id
    WHERE ri.review_id IN (SELECT fp_id.id FROM feed_page fp_id)
    GROUP BY ri.review_id
  ),
  credits_agg AS (
    SELECT
      bc.building_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(pp.name, cc.name),
          'id',   COALESCE(bc.person_id, bc.company_id)
        )
        ORDER BY COALESCE(pp.name, cc.name)
      ) FILTER (WHERE COALESCE(pp.name, cc.name) IS NOT NULL) AS credited_entities
    FROM public.building_credits bc
    LEFT JOIN public.people pp    ON bc.person_id  = pp.id
    LEFT JOIN public.companies cc ON bc.company_id = cc.id
    WHERE bc.building_id IN (SELECT DISTINCT fp_id.building_id FROM feed_page fp_id)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT pe.claimed_by_user_id AS user_id
    FROM public.people pe
    WHERE pe.claimed_by_user_id IN (SELECT DISTINCT fp_id.user_id FROM feed_page fp_id)
      AND pe.claim_status::text IN ('claimed', 'verified')
  ),
  architect_of_building AS (
    SELECT DISTINCT fp_id.user_id, fp_id.building_id
    FROM feed_page fp_id
    JOIN public.building_credits bc
      ON bc.building_id = fp_id.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = fp_id.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = fp_id.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT fp_id.user_id FROM feed_page fp_id)
    GROUP BY fc.following_id
  )
  SELECT
    fp.id,
    fp.content,
    fp.rating,
    fp.tags,
    fp.created_at,
    fp.edited_at,
    fp.status::TEXT,
    fp.user_id,
    fp.building_id,
    jsonb_build_object(
      'id',                       p.id,
      'username',                 p.username,
      'avatar_url',               p.avatar_url,
      'is_verified_architect',    (va.user_id IS NOT NULL),
      'is_architect_of_building', (aob.user_id IS NOT NULL),
      'followers_count',          COALESCE(fcc.cnt, 0)
    ) AS user_data,
    jsonb_build_object(
      'id',                    b.id,
      'name',                  b.name,
      'main_image_url',        public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address',               b.address,
      'credited_entities',     COALESCE(ca.credited_entities, '[]'::jsonb),
      'year_completed',        b.year_completed,
      'city',                  b.city,
      'country',               b.country,
      'slug',                  b.slug,
      'short_id',              b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug',    loc.city_slug
    ) AS building_data,
    COALESCE(la.cnt, 0)               AS likes_count,
    COALESCE(cmta.cnt, 0)             AS comments_count,
    fp.views_count                    AS views_count,
    (ul.interaction_id IS NOT NULL)   AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb)    AS review_images
  FROM feed_page fp
  LEFT JOIN public.profiles p            ON p.id = fp.user_id
  LEFT JOIN public.buildings b           ON b.id = fp.building_id
  LEFT JOIN public.localities loc        ON loc.id = b.locality_id
  LEFT JOIN likes_agg la                 ON la.interaction_id = fp.id
  LEFT JOIN comments_agg cmta            ON cmta.interaction_id = fp.id
  LEFT JOIN user_likes ul                ON ul.interaction_id = fp.id
  LEFT JOIN images_agg ia                ON ia.review_id = fp.id
  LEFT JOIN credits_agg ca               ON ca.building_id = fp.building_id
  LEFT JOIN verified_architects va       ON va.user_id = fp.user_id
  LEFT JOIN architect_of_building aob
    ON aob.user_id = fp.user_id AND aob.building_id = fp.building_id
  LEFT JOIN followers_counts fcc         ON fcc.user_id = fp.user_id
  ORDER BY fp.sort_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update get_suggested_posts to surface views_count
DROP FUNCTION IF EXISTS get_suggested_posts(INT, INT);
CREATE OR REPLACE FUNCTION get_suggested_posts(p_limit INT, p_offset INT)
RETURNS TABLE (
  id              UUID,
  content         TEXT,
  rating          INTEGER,
  tags            TEXT[],
  created_at      TIMESTAMPTZ,
  edited_at       TIMESTAMPTZ,
  status          TEXT,
  user_id         UUID,
  building_id     UUID,
  user_data       JSONB,
  building_data   JSONB,
  likes_count     BIGINT,
  comments_count  BIGINT,
  views_count     BIGINT,
  is_liked        BOOLEAN,
  review_images   JSONB,
  is_suggested    BOOLEAN,
  suggestion_reason TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH candidate_posts AS (
    SELECT
      bp.id,
      bp.body        AS content,
      ub.rating,
      bp.tags,
      bp.created_at,
      bp.updated_at  AS edited_at,
      ub.status,
      bp.user_id,
      bp.building_id,
      bp.views_count
    FROM public.building_posts bp
    JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    LEFT JOIN public.buildings b ON b.id = bp.building_id
    WHERE
      bp.user_id != v_user_id
      AND bp.user_id NOT IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
      AND ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      AND (
        bp.body       IS NOT NULL
        OR bp.tags    IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR EXISTS (SELECT 1 FROM review_images ri WHERE ri.review_id = bp.id)
      )
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM candidate_posts)
    GROUP BY l.interaction_id
  ),
  ranked_page AS (
    SELECT
      cp.*,
      COALESCE(la.cnt, 0) AS likes_count
    FROM candidate_posts cp
    LEFT JOIN likes_agg la ON la.interaction_id = cp.id
    ORDER BY
      ((COALESCE(cp.rating, 0) * 2) + COALESCE(la.cnt, 0)) DESC,
      cp.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM comments c
    WHERE c.interaction_id IN (SELECT id FROM ranked_page)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM ranked_page)
      AND l.user_id = v_user_id
  ),
  images_agg AS (
    SELECT
      ri.review_id,
      jsonb_agg(
        jsonb_build_object(
          'id',          ri.id,
          'storage_path', ri.storage_path,
          'likes_count', ri.likes_count,
          'is_liked',    (il.image_id IS NOT NULL)
        )
      ) AS imgs
    FROM review_images ri
    LEFT JOIN image_likes il ON il.image_id = ri.id AND il.user_id = v_user_id
    WHERE ri.review_id IN (SELECT id FROM ranked_page)
    GROUP BY ri.review_id
  ),
  credits_agg AS (
    SELECT
      bc.building_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(pp.name, cc.name),
          'id',   COALESCE(bc.person_id, bc.company_id)
        )
        ORDER BY COALESCE(pp.name, cc.name)
      ) FILTER (WHERE COALESCE(pp.name, cc.name) IS NOT NULL) AS credited_entities
    FROM building_credits bc
    LEFT JOIN public.people pp    ON bc.person_id  = pp.id
    LEFT JOIN public.companies cc ON bc.company_id = cc.id
    WHERE bc.building_id IN (SELECT DISTINCT building_id FROM ranked_page)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT pe.claimed_by_user_id AS user_id
    FROM public.people pe
    WHERE pe.claimed_by_user_id IN (SELECT DISTINCT user_id FROM ranked_page)
      AND pe.claim_status::text IN ('claimed', 'verified')
  ),
  architect_of_building AS (
    SELECT DISTINCT rp.user_id, rp.building_id
    FROM ranked_page rp
    JOIN public.building_credits bc
      ON bc.building_id = rp.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = rp.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = rp.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT user_id FROM ranked_page)
    GROUP BY fc.following_id
  )
  SELECT
    rp.id,
    rp.content,
    rp.rating,
    rp.tags,
    rp.created_at,
    rp.edited_at,
    rp.status::TEXT,
    rp.user_id,
    rp.building_id,
    jsonb_build_object(
      'id',                     p.id,
      'username',               p.username,
      'avatar_url',             p.avatar_url,
      'is_verified_architect',  (va.user_id IS NOT NULL),
      'is_architect_of_building', (aob.user_id IS NOT NULL),
      'followers_count',        COALESCE(fcc.cnt, 0)
    ) AS user_data,
    jsonb_build_object(
      'id',                   b.id,
      'name',                 b.name,
      'main_image_url',       public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address',              b.address,
      'credited_entities',    COALESCE(ca.credited_entities, '[]'::jsonb),
      'year_completed',       b.year_completed,
      'city',                 b.city,
      'country',              b.country,
      'slug',                 b.slug,
      'short_id',             b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug',   loc.city_slug
    ) AS building_data,
    rp.likes_count,
    COALESCE(cmta.cnt, 0)          AS comments_count,
    rp.views_count                 AS views_count,
    (ul.interaction_id IS NOT NULL) AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb) AS review_images,
    TRUE                            AS is_suggested,
    'Popular'::TEXT                 AS suggestion_reason
  FROM ranked_page rp
  LEFT JOIN profiles p            ON p.id = rp.user_id
  LEFT JOIN buildings b           ON b.id = rp.building_id
  LEFT JOIN localities loc        ON loc.id = b.locality_id
  LEFT JOIN comments_agg cmta     ON cmta.interaction_id = rp.id
  LEFT JOIN user_likes ul         ON ul.interaction_id = rp.id
  LEFT JOIN images_agg ia         ON ia.review_id = rp.id
  LEFT JOIN credits_agg ca        ON ca.building_id = rp.building_id
  LEFT JOIN verified_architects va ON va.user_id = rp.user_id
  LEFT JOIN architect_of_building aob
    ON aob.user_id = rp.user_id AND aob.building_id = rp.building_id
  LEFT JOIN followers_counts fcc  ON fcc.user_id = rp.user_id
  ORDER BY
    (rp.likes_count * 2 + COALESCE(rp.rating, 0) * 2) DESC,
    rp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
