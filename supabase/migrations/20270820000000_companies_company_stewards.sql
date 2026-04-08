-- Task 1.2 (Roadmap): `companies`, `company_stewards`, migrate `architects` where type = studio.
-- Depends on `person_claim_status` and `slugify_person_name` from 20270819000000_people_table_credit_enums.sql.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.company_steward_role AS ENUM ('owner', 'steward');

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

CREATE TABLE public.companies (
  id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  bio text,
  country text,
  founded_year integer,
  dissolved_year integer,
  logo_url text,
  website text,
  verified_domain text,
  claim_status public.person_claim_status NOT NULL DEFAULT 'unclaimed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_slug_key UNIQUE (slug),
  CONSTRAINT companies_founded_year_reasonable
    CHECK (founded_year IS NULL OR (founded_year >= 1000 AND founded_year <= 2100)),
  CONSTRAINT companies_dissolved_year_reasonable
    CHECK (dissolved_year IS NULL OR (dissolved_year >= 1000 AND dissolved_year <= 2100))
);

COMMENT ON TABLE public.companies IS
  'Practice / studio entities; UUIDs preserved from architects where type = studio (Building Credits v2 Task 1.2).';

COMMENT ON COLUMN public.companies.country IS
  'Migrated from architects.headquarters (best-effort). Review rows where headquarters looked non-country (comma, very long).';

-- ---------------------------------------------------------------------------
-- company_stewards
-- ---------------------------------------------------------------------------

CREATE TABLE public.company_stewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.company_steward_role NOT NULL,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_stewards_pkey PRIMARY KEY (id),
  CONSTRAINT company_stewards_company_id_user_id_key UNIQUE (company_id, user_id),
  CONSTRAINT company_stewards_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE,
  CONSTRAINT company_stewards_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT company_stewards_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX company_stewards_company_id_idx ON public.company_stewards (company_id);
CREATE INDEX company_stewards_user_id_idx ON public.company_stewards (user_id);

-- ---------------------------------------------------------------------------
-- Data: studios only, preserve ids
-- ---------------------------------------------------------------------------

WITH studio AS (
  SELECT
    a.id,
    a.name,
    a.bio,
    NULLIF(trim(a.headquarters), '') AS hq,
    a.website_url AS website_src,
    COALESCE(a.created_at, now()) AS created_at,
    COALESCE(
      NULLIF(public.slugify_person_name(a.name), ''),
      'company-' || substring(replace(a.id::text, '-', ''), 1, 12)
    ) AS base_slug
  FROM public.architects a
  WHERE a.type = 'studio'
),
ranked AS (
  SELECT
    studio.*,
    row_number() OVER (
      PARTITION BY base_slug
      ORDER BY created_at ASC, id ASC
    ) AS slug_rank
  FROM studio
)
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
  verified_domain,
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
  hq AS country,
  NULL::integer,
  NULL::integer,
  NULL::text,
  website_src,
  NULL::text,
  'unclaimed'::public.person_claim_status,
  created_at,
  COALESCE(created_at, now())
FROM ranked;

-- Owner stewards from profiles.verified_architect_id when it points at a migrated company
INSERT INTO public.company_stewards (company_id, user_id, role, invited_by, created_at)
SELECT DISTINCT
  pr.verified_architect_id,
  pr.id,
  'owner'::public.company_steward_role,
  NULL::uuid,
  now()
FROM public.profiles pr
WHERE pr.verified_architect_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = pr.verified_architect_id
  );

UPDATE public.companies c
SET claim_status = 'claimed'::public.person_claim_status
WHERE EXISTS (
  SELECT 1
  FROM public.company_stewards cs
  WHERE cs.company_id = c.id
    AND cs.role = 'owner'::public.company_steward_role
);

-- ---------------------------------------------------------------------------
-- RLS: companies (public read; authenticated insert; stewards + admin update)
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT
  USING (true);

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = companies.id
        AND cs.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = companies.id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: company_stewards (members + admin read; stewards + admin write)
-- ---------------------------------------------------------------------------

ALTER TABLE public.company_stewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_stewards_select" ON public.company_stewards
  FOR SELECT
  USING (
    public.is_admin()
    OR user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_stewards.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "company_stewards_insert" ON public.company_stewards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_stewards.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
    OR (
      user_id = (SELECT auth.uid())
      AND role = 'owner'::public.company_steward_role
      AND NOT EXISTS (
        SELECT 1
        FROM public.company_stewards cs2
        WHERE cs2.company_id = company_stewards.company_id
      )
    )
  );

CREATE POLICY "company_stewards_update" ON public.company_stewards
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_stewards.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_stewards.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "company_stewards_delete" ON public.company_stewards
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_stewards.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );
