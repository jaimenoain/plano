-- Task 1.1 (Roadmap): `people` table, credit enums, migrate `architects` rows where type = individual.
-- Apply via Supabase SQL Editor before relying on `people` in the app.

-- ---------------------------------------------------------------------------
-- Enums (used by later building_credits migrations)
-- ---------------------------------------------------------------------------

CREATE TYPE public.person_claim_status AS ENUM ('unclaimed', 'claimed', 'verified');

CREATE TYPE public.credit_role_enum AS ENUM (
  'design_architect',
  'architect_of_record',
  'executive_architect',
  'interior_architect',
  'landscape_architect',
  'urban_designer',
  'conservation_architect',
  'structural_engineer',
  'mep_engineer',
  'civil_engineer',
  'geotechnical_engineer',
  'facade_engineer',
  'wind_consultant',
  'acoustic_consultant',
  'fire_engineer',
  'lighting_designer',
  'developer',
  'main_contractor',
  'project_manager',
  'cost_consultant',
  'planning_consultant',
  'graphic_wayfinding_designer',
  'art_consultant',
  'sustainability_consultant',
  'heritage_consultant',
  'other'
);

CREATE TYPE public.credit_tier_enum AS ENUM ('primary', 'contributor', 'ancillary');

-- ---------------------------------------------------------------------------
-- Slug helper (migration + future app use)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.slugify_person_name(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' FROM regexp_replace(
      regexp_replace(lower(trim(COALESCE(raw, ''))), '[^a-z0-9]+', '-', 'gi'),
      '-+',
      '-',
      'g'
    )),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- Align architects with generated client types where a column may be missing locally
-- ---------------------------------------------------------------------------

ALTER TABLE public.architects ADD COLUMN IF NOT EXISTS nationality text;

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------

CREATE TABLE public.people (
  id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  bio text,
  nationality text,
  birth_year integer,
  death_year integer,
  avatar_url text,
  website text,
  location_note text,
  claimed_by_user_id uuid,
  claim_status public.person_claim_status NOT NULL DEFAULT 'unclaimed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT people_pkey PRIMARY KEY (id),
  CONSTRAINT people_slug_key UNIQUE (slug),
  CONSTRAINT people_claimed_by_user_id_fkey
    FOREIGN KEY (claimed_by_user_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT people_birth_year_reasonable
    CHECK (birth_year IS NULL OR (birth_year >= 1000 AND birth_year <= 2100)),
  CONSTRAINT people_death_year_reasonable
    CHECK (death_year IS NULL OR (death_year >= 1000 AND death_year <= 2100))
);

CREATE INDEX people_claimed_by_user_id_idx ON public.people (claimed_by_user_id);

COMMENT ON TABLE public.people IS
  'Individual credit entities; UUIDs preserved from architects where type = individual (Building Credits v2 Task 1.1).';

-- ---------------------------------------------------------------------------
-- Data: individuals only, preserve ids; avatar_url null per roadmap
-- ---------------------------------------------------------------------------

WITH indiv AS (
  SELECT
    a.id,
    a.name,
    a.bio,
    a.nationality,
    a.headquarters AS location_note,
    a.website_url AS website_src,
    COALESCE(a.created_at, now()) AS created_at,
    COALESCE(
      NULLIF(public.slugify_person_name(a.name), ''),
      'person-' || substring(replace(a.id::text, '-', ''), 1, 12)
    ) AS base_slug
  FROM public.architects a
  WHERE a.type = 'individual'
),
ranked AS (
  SELECT
    indiv.*,
    row_number() OVER (
      PARTITION BY base_slug
      ORDER BY created_at ASC, id ASC
    ) AS slug_rank
  FROM indiv
)
INSERT INTO public.people (
  id,
  name,
  slug,
  bio,
  nationality,
  birth_year,
  death_year,
  avatar_url,
  website,
  location_note,
  claimed_by_user_id,
  claim_status,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  CASE slug_rank
    WHEN 1 THEN base_slug
    ELSE base_slug || '-' || slug_rank::text
  END AS slug,
  bio,
  nationality,
  NULL::integer,
  NULL::integer,
  NULL::text,
  website_src,
  location_note,
  NULL::uuid,
  'unclaimed'::public.person_claim_status,
  created_at,
  COALESCE(created_at, now())
FROM ranked;

-- Authoritative verified link: profiles.verified_architect_id → people.id (individuals only)
UPDATE public.people p
SET
  claimed_by_user_id = pr.id,
  claim_status = 'claimed'::public.person_claim_status
FROM public.profiles pr
WHERE pr.verified_architect_id = p.id;

-- Secondary: verified architect_claims not already covered
UPDATE public.people p
SET
  claimed_by_user_id = sub.user_id,
  claim_status = 'claimed'::public.person_claim_status
FROM (
  SELECT DISTINCT ON (ac.architect_id)
    ac.architect_id,
    ac.user_id
  FROM public.architect_claims ac
  WHERE ac.status = 'verified'
  ORDER BY ac.architect_id, ac.resolved_at ASC NULLS LAST, ac.created_at ASC
) sub
WHERE p.id = sub.architect_id
  AND p.claimed_by_user_id IS NULL;

-- ---------------------------------------------------------------------------
-- RLS: public read; authenticated insert; update by claim owner or admin
-- ---------------------------------------------------------------------------

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_select" ON public.people
  FOR SELECT
  USING (true);

CREATE POLICY "people_insert" ON public.people
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "people_update" ON public.people
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR claimed_by_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR claimed_by_user_id = (SELECT auth.uid())
  );
