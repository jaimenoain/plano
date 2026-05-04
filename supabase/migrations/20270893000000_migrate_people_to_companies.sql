-- Migration: 20270893000000_migrate_people_to_companies.sql
-- Task: All entries in 'people' are actually companies. Move them to the companies table and update all references.

BEGIN;

-- 1. Create a helper function for verification checks that looks at both people and companies
-- This ensures that badges and permissions continue to work even after the move.
CREATE OR REPLACE FUNCTION public.is_user_verified_architect(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.people pe
    WHERE pe.claimed_by_user_id = p_user_id
      AND pe.claim_status::text IN ('claimed', 'verified')
  ) OR EXISTS (
    SELECT 1 FROM public.company_stewards cs
    JOIN public.companies c ON cs.company_id = c.id
    WHERE cs.user_id = p_user_id
      AND cs.role = 'owner'::public.company_steward_role
      AND c.claim_status::text IN ('claimed', 'verified')
  );
$$;

-- 1.b Update is_verified_architect_for_building to be robust
CREATE OR REPLACE FUNCTION public.is_verified_architect_for_building(user_uuid UUID, building_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_uuid IS NULL OR building_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.building_credits bc
    WHERE bc.building_id = building_uuid
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
      AND (
        -- Check if user owns a person linked to this credit
        EXISTS (SELECT 1 FROM public.people pe WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = user_uuid)
        OR
        -- Check if user is a steward of a company linked to this credit
        EXISTS (SELECT 1 FROM public.company_stewards cs WHERE cs.company_id = bc.company_id AND cs.user_id = user_uuid)
      )
  );
END;
$$;

-- 2. Move data from people to companies
-- We preserve the UUIDs. We map person-specific fields to company-specific ones.
INSERT INTO public.companies (
    id, 
    name, 
    slug, 
    bio, 
    country, 
    founded_year, 
    dissolved_year, 
    logo_url, 
    website, 
    claim_status, 
    created_at, 
    updated_at
)
SELECT
    id,
    name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.companies c WHERE c.slug = p.slug AND c.id <> p.id) 
        THEN p.slug || '-migrated-' || substring(p.id::text, 1, 4)
        ELSE p.slug 
    END AS slug,
    bio,
    COALESCE(nationality, location_note) AS country,
    birth_year AS founded_year,
    death_year AS dissolved_year,
    avatar_url AS logo_url,
    website,
    claim_status,
    created_at,
    updated_at
FROM public.people p
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    bio = EXCLUDED.bio,
    country = EXCLUDED.country,
    founded_year = EXCLUDED.founded_year,
    dissolved_year = EXCLUDED.dissolved_year,
    logo_url = EXCLUDED.logo_url,
    website = EXCLUDED.website,
    claim_status = EXCLUDED.claim_status,
    updated_at = EXCLUDED.updated_at;

-- 3. Move claim ownership to company_stewards
-- In the people table, ownership was a column. In companies, it's a separate table.
INSERT INTO public.company_stewards (company_id, user_id, role, created_at)
SELECT
    id,
    claimed_by_user_id,
    'owner'::public.company_steward_role,
    now()
FROM public.people
WHERE claimed_by_user_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 4. Update foreign key references in other tables

-- 4.a building_credits: Move person_id to company_id
-- First, delete any credits that would cause a unique constraint violation after the move
DELETE FROM public.building_credits bc
WHERE person_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.building_credits bc2 
    WHERE bc2.building_id = bc.building_id 
      AND bc2.company_id = bc.person_id 
      AND bc2.role = bc.role
      AND bc2.person_id IS NULL
  );

UPDATE public.building_credits
SET company_id = person_id,
    person_id = NULL
WHERE person_id IS NOT NULL;

-- 4.b award_recipients: Change type to company and move the ID
UPDATE public.award_recipients
SET recipient_company_id = recipient_person_id,
    recipient_type = 'company',
    recipient_person_id = NULL
WHERE recipient_person_id IS NOT NULL;

-- 4.c events: Move organiser_person_id to organiser_company_id
UPDATE public.events
SET organiser_company_id = organiser_person_id,
    organiser_person_id = NULL
WHERE organiser_person_id IS NOT NULL;

-- 4.d person_company_affiliations
-- This table is for linking people to companies. If the person is now a company,
-- we might want to keep the link (as a partnership/affiliation) but we need to update the FK.
ALTER TABLE public.person_company_affiliations DROP CONSTRAINT IF EXISTS person_company_affiliations_person_id_fkey;
ALTER TABLE public.person_company_affiliations 
  ADD CONSTRAINT person_company_affiliations_person_id_fkey 
  FOREIGN KEY (person_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Finalize the move by emptying the people table
-- We keep the table structure for now in case the app still expects it to exist (even if empty).
DELETE FROM public.people;

-- 6. Update key RPCs to ensure they check companies for verification
-- get_feed (latest version from 20270873)
DROP FUNCTION IF EXISTS get_feed(integer, integer);
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
    SELECT DISTINCT user_id FROM (
      SELECT pe.claimed_by_user_id AS user_id FROM public.people pe WHERE pe.claim_status::text IN ('claimed', 'verified')
      UNION
      SELECT cs.user_id FROM public.company_stewards cs JOIN public.companies c ON cs.company_id = c.id WHERE cs.role = 'owner' AND c.claim_status::text IN ('claimed', 'verified')
    ) sub
    WHERE user_id IN (SELECT DISTINCT fp_id.user_id FROM feed_page fp_id)
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

COMMIT;
