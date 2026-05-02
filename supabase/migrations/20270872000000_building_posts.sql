-- =============================================================================
-- Migration: building_posts
-- Purpose:   Replace user_buildings.content (single note per user per building)
--            with a dedicated building_posts table that supports multiple posts
--            per user per building (title, body, tags, attachments).
--
--            Strategy: migrate existing rows using the SAME UUID so that all
--            existing likes.interaction_id, comments.interaction_id, and
--            review_images.review_id FK values remain valid — only the FK
--            constraint targets change.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. building_posts table
-- -----------------------------------------------------------------------------

CREATE TABLE public.building_posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  building_id UUID        NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  title       TEXT,
  body        TEXT,
  tags        TEXT[],
  video_url   TEXT,
  visibility  TEXT        NOT NULL DEFAULT 'public',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_building_posts_building_id    ON public.building_posts(building_id);
CREATE INDEX idx_building_posts_user_id        ON public.building_posts(user_id);
CREATE INDEX idx_building_posts_user_building  ON public.building_posts(user_id, building_id);
CREATE INDEX idx_building_posts_updated_at     ON public.building_posts(updated_at DESC);

ALTER TABLE public.building_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "building_posts_select"
  ON public.building_posts FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    OR (
      COALESCE(visibility, 'public') = 'public'
      OR (
        visibility = 'contacts'
        AND EXISTS (
          SELECT 1
          FROM public.follows f
          WHERE f.follower_id = (SELECT auth.uid())
            AND f.following_id = building_posts.user_id
        )
      )
    )
  );

CREATE POLICY "building_posts_insert"
  ON public.building_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "building_posts_update"
  ON public.building_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "building_posts_delete"
  ON public.building_posts FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. Migrate existing user_buildings rows → building_posts (same UUIDs)
--    All rows are migrated so that every existing FK target remains valid.
--    Rows with no content/images/links will have body IS NULL; they are hidden
--    from feed/review queries by the NOT NULL filters in the updated RPCs.
-- -----------------------------------------------------------------------------

INSERT INTO public.building_posts (
  id, user_id, building_id, title, body, tags, video_url,
  visibility, created_at, updated_at
)
SELECT
  ub.id,
  ub.user_id,
  ub.building_id,
  NULL,
  ub.content,
  ub.tags,
  ub.video_url,
  COALESCE(ub.visibility, 'public'),
  ub.created_at,
  COALESCE(ub.edited_at, ub.created_at)
FROM public.user_buildings ub;

-- -----------------------------------------------------------------------------
-- 3. Re-point FK constraints to building_posts
-- -----------------------------------------------------------------------------

-- review_images.review_id  →  building_posts(id)
ALTER TABLE public.review_images
  DROP CONSTRAINT IF EXISTS review_images_review_id_fkey;
ALTER TABLE public.review_images
  ADD CONSTRAINT review_images_review_id_fkey
  FOREIGN KEY (review_id) REFERENCES public.building_posts(id) ON DELETE CASCADE;

-- review_links.review_id  →  building_posts(id)
ALTER TABLE public.review_links
  DROP CONSTRAINT IF EXISTS review_links_review_id_fkey;
ALTER TABLE public.review_links
  ADD CONSTRAINT review_links_review_id_fkey
  FOREIGN KEY (review_id) REFERENCES public.building_posts(id) ON DELETE CASCADE;

-- likes.interaction_id  →  building_posts(id)
ALTER TABLE public.likes
  DROP CONSTRAINT IF EXISTS likes_user_building_id_fkey;
ALTER TABLE public.likes
  ADD CONSTRAINT likes_building_post_id_fkey
  FOREIGN KEY (interaction_id) REFERENCES public.building_posts(id) ON DELETE CASCADE;

-- comments.interaction_id  →  building_posts(id)
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_user_building_id_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_building_post_id_fkey
  FOREIGN KEY (interaction_id) REFERENCES public.building_posts(id) ON DELETE CASCADE;

-- notifications.resource_id  →  building_posts(id)  (nullable column, SET NULL on delete)
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_resource_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_resource_id_fkey
  FOREIGN KEY (resource_id) REFERENCES public.building_posts(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 4. Drop migrated columns from user_buildings
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view user_buildings" ON public.user_buildings;

CREATE POLICY "Users can view user_buildings" ON public.user_buildings
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1
      FROM public.building_posts bp
      WHERE bp.user_id = user_buildings.user_id
        AND bp.building_id = user_buildings.building_id
        AND (
          COALESCE(bp.visibility, 'public') = 'public'
          OR (
            bp.visibility = 'contacts'
            AND EXISTS (
              SELECT 1
              FROM public.follows f
              WHERE f.follower_id = (SELECT auth.uid())
                AND f.following_id = user_buildings.user_id
            )
          )
        )
    )
  );

ALTER TABLE public.user_buildings
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS edited_at;

-- -----------------------------------------------------------------------------
-- 5. get_building_reviews — read from building_posts + join user_buildings
--    for rating/status.  Output column names are unchanged so the client
--    TypeScript types continue to work without modification.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_building_reviews(p_building_id UUID)
RETURNS TABLE (
  id          UUID,
  user_id     UUID,
  content     TEXT,
  rating      INTEGER,
  status      TEXT,
  tags        TEXT[],
  created_at  TIMESTAMPTZ,
  video_url   TEXT,
  user_data   JSONB,
  images      JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.user_id,
    bp.body                     AS content,
    ub.rating,
    ub.status::TEXT,
    bp.tags,
    bp.created_at,
    bp.video_url,
    jsonb_build_object(
      'username',               p.username,
      'avatar_url',             p.avatar_url,
      'is_verified_architect',  EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.claimed_by_user_id = p.id
          AND pe.claim_status::text IN ('claimed', 'verified')
      ),
      'is_architect_of_building', EXISTS (
        SELECT 1 FROM public.building_credits bc
        WHERE bc.building_id = bp.building_id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND (
            bc.person_id IN (
              SELECT pe_sub.id FROM public.people pe_sub
              WHERE pe_sub.claimed_by_user_id = p.id
            )
            OR bc.company_id IN (
              SELECT cs.company_id FROM public.company_stewards cs
              WHERE cs.user_id = p.id
            )
          )
      )
    ) AS user_data,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',           ri.id,
            'storage_path', ri.storage_path,
            'likes_count',  ri.likes_count,
            'created_at',   ri.created_at,
            'is_generated', ri.is_generated,
            'is_official',  ri.is_official
          )
        )
        FROM public.review_images ri
        WHERE ri.review_id = bp.id
      ),
      '[]'::jsonb
    ) AS images
  FROM public.building_posts bp
  LEFT JOIN public.user_buildings ub
    ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
  LEFT JOIN public.profiles p ON p.id = bp.user_id
  WHERE bp.building_id = p_building_id
    AND (
      bp.body       IS NOT NULL
      OR bp.tags    IS NOT NULL
      OR bp.video_url IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
    )
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.get_building_reviews(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_building_reviews(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_building_reviews(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. get_feed — rewrite primary table to building_posts
--    Output column names are preserved so useFeed.ts requires no changes.
-- -----------------------------------------------------------------------------

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
      COALESCE(bp.updated_at, bp.created_at) AS sort_at
    FROM public.building_posts bp
    JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    WHERE
      (bp.user_id = v_user_id
       OR bp.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id))
      AND ub.status != 'ignored'
      AND (
        bp.body       IS NOT NULL
        OR bp.tags    IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR EXISTS (SELECT 1 FROM review_images ri WHERE ri.review_id = bp.id)
      )
    ORDER BY COALESCE(bp.updated_at, bp.created_at) DESC
    LIMIT p_limit OFFSET p_offset
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM feed_page)
    GROUP BY l.interaction_id
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM comments c
    WHERE c.interaction_id IN (SELECT id FROM feed_page)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM feed_page)
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
    WHERE ri.review_id IN (SELECT id FROM feed_page)
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
    WHERE bc.building_id IN (SELECT DISTINCT building_id FROM feed_page)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT pe.claimed_by_user_id AS user_id
    FROM public.people pe
    WHERE pe.claimed_by_user_id IN (SELECT DISTINCT user_id FROM feed_page)
      AND pe.claim_status::text IN ('claimed', 'verified')
  ),
  architect_of_building AS (
    SELECT DISTINCT fp.user_id, fp.building_id
    FROM feed_page fp
    JOIN public.building_credits bc
      ON bc.building_id = fp.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = fp.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = fp.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT user_id FROM feed_page)
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
    COALESCE(la.cnt, 0)          AS likes_count,
    COALESCE(cmta.cnt, 0)        AS comments_count,
    (ul.interaction_id IS NOT NULL) AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb) AS review_images
  FROM feed_page fp
  LEFT JOIN profiles p            ON p.id = fp.user_id
  LEFT JOIN buildings b           ON b.id = fp.building_id
  LEFT JOIN localities loc        ON loc.id = b.locality_id
  LEFT JOIN likes_agg la          ON la.interaction_id = fp.id
  LEFT JOIN comments_agg cmta     ON cmta.interaction_id = fp.id
  LEFT JOIN user_likes ul         ON ul.interaction_id = fp.id
  LEFT JOIN images_agg ia         ON ia.review_id = fp.id
  LEFT JOIN credits_agg ca        ON ca.building_id = fp.building_id
  LEFT JOIN verified_architects va ON va.user_id = fp.user_id
  LEFT JOIN architect_of_building aob
    ON aob.user_id = fp.user_id AND aob.building_id = fp.building_id
  LEFT JOIN followers_counts fcc  ON fcc.user_id = fp.user_id
  ORDER BY fp.sort_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- -----------------------------------------------------------------------------
-- 7. get_suggested_posts — rewrite primary table to building_posts
--    Output column names are preserved so useSuggestedFeed.ts requires no
--    changes.
-- -----------------------------------------------------------------------------

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
      bp.building_id
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

-- -----------------------------------------------------------------------------
-- 8. get_building_top_links — join review_links → building_posts (not
--    user_buildings) since the FK target has changed.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_building_top_links(
  p_building_id UUID,
  p_limit       INT DEFAULT 5
)
RETURNS TABLE (
  link_id       UUID,
  url           TEXT,
  title         TEXT,
  like_count    BIGINT,
  user_username TEXT,
  user_avatar   TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.id          AS link_id,
    rl.url,
    rl.title,
    COUNT(ll.id)   AS like_count,
    p.username     AS user_username,
    p.avatar_url   AS user_avatar
  FROM public.review_links rl
  JOIN public.building_posts bp ON rl.review_id = bp.id
  LEFT JOIN public.link_likes ll ON rl.id = ll.link_id
  JOIN public.profiles p ON rl.user_id = p.id
  WHERE bp.building_id = p_building_id
  GROUP BY rl.id, rl.url, rl.title, p.username, p.avatar_url
  ORDER BY like_count DESC, rl.created_at DESC
  LIMIT p_limit;
END;
$$;
