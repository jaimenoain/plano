-- Task 1.4 (Roadmap): `building_credits`, migrate from `building_architects`.
-- Depends on `people` / credit enums (20270819), `companies` (20270820). Apply via Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.credit_status_enum AS ENUM (
  'active',
  'verified',
  'flagged',
  'hidden'
);

CREATE TYPE public.credit_flag_reason_enum AS ENUM (
  'wrong_person',
  'never_involved',
  'wrong_role',
  'other'
);

-- ---------------------------------------------------------------------------
-- building_credits
-- ---------------------------------------------------------------------------

CREATE TABLE public.building_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  person_id uuid,
  company_id uuid,
  role public.credit_role_enum NOT NULL,
  role_custom text,
  credit_tier public.credit_tier_enum NOT NULL DEFAULT 'contributor',
  is_lead boolean NOT NULL DEFAULT false,
  contribution_notes text,
  year_from integer,
  year_to integer,
  project_url text,
  status public.credit_status_enum NOT NULL DEFAULT 'active',
  flag_reason public.credit_flag_reason_enum,
  flag_notes text,
  flagged_at timestamptz,
  flagged_by_user_id uuid,
  added_by_user_id uuid,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT building_credits_pkey PRIMARY KEY (id),
  CONSTRAINT building_credits_building_id_fkey
    FOREIGN KEY (building_id) REFERENCES public.buildings (id) ON DELETE CASCADE,
  CONSTRAINT building_credits_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people (id) ON DELETE CASCADE,
  CONSTRAINT building_credits_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE,
  CONSTRAINT building_credits_flagged_by_user_id_fkey
    FOREIGN KEY (flagged_by_user_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT building_credits_added_by_user_id_fkey
    FOREIGN KEY (added_by_user_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT building_credits_person_or_company_required
    CHECK (person_id IS NOT NULL OR company_id IS NOT NULL),
  CONSTRAINT building_credits_year_from_reasonable
    CHECK (year_from IS NULL OR (year_from >= 1000 AND year_from <= 2100)),
  CONSTRAINT building_credits_year_to_reasonable
    CHECK (year_to IS NULL OR (year_to >= 1000 AND year_to <= 2100)),
  CONSTRAINT building_credits_year_range_sensible
    CHECK (year_from IS NULL OR year_to IS NULL OR year_to >= year_from)
);

CREATE INDEX building_credits_building_id_idx ON public.building_credits (building_id);
CREATE INDEX building_credits_person_id_idx ON public.building_credits (person_id);
CREATE INDEX building_credits_company_id_idx ON public.building_credits (company_id);
CREATE INDEX building_credits_status_idx ON public.building_credits (status);

COMMENT ON TABLE public.building_credits IS
  'Credits linking buildings to people and/or companies (Building Credits v2 Task 1.4); backfilled from building_architects.';

-- ---------------------------------------------------------------------------
-- Data: building_architects → building_credits (individual → person_id, studio → company_id)
-- Skips rows whose architect is not present in people/companies (data integrity).
-- ---------------------------------------------------------------------------

INSERT INTO public.building_credits (
  building_id,
  person_id,
  company_id,
  role,
  role_custom,
  credit_tier,
  is_lead,
  contribution_notes,
  year_from,
  year_to,
  project_url,
  status,
  flag_reason,
  flag_notes,
  flagged_at,
  flagged_by_user_id,
  added_by_user_id,
  display_order,
  created_at,
  updated_at
)
SELECT
  s.building_id,
  s.person_id,
  s.company_id,
  'design_architect'::public.credit_role_enum,
  NULL::text,
  'primary'::public.credit_tier_enum,
  true,
  NULL::text,
  NULL::integer,
  NULL::integer,
  NULL::text,
  'active'::public.credit_status_enum,
  NULL::public.credit_flag_reason_enum,
  NULL::text,
  NULL::timestamptz,
  NULL::uuid,
  NULL::uuid,
  s.display_order,
  s.created_at,
  s.updated_at
FROM (
  SELECT
    ba.building_id,
    CASE WHEN a.type = 'individual' THEN ba.architect_id END AS person_id,
    CASE WHEN a.type = 'studio' THEN ba.architect_id END AS company_id,
    (ROW_NUMBER() OVER (
      PARTITION BY ba.building_id
      ORDER BY ba.created_at ASC, ba.architect_id ASC
    ))::integer AS display_order,
    ba.created_at,
    ba.created_at AS updated_at
  FROM public.building_architects ba
  INNER JOIN public.architects a ON a.id = ba.architect_id
  WHERE
    (
      a.type = 'individual'
      AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = ba.architect_id)
    )
    OR (
      a.type = 'studio'
      AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = ba.architect_id)
    )
) s;

-- ---------------------------------------------------------------------------
-- RLS: public read except hidden (admins see all); authenticated insert;
-- update/delete: admin, building creator (delete), or entity claim owner / company steward (update)
-- ---------------------------------------------------------------------------

ALTER TABLE public.building_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "building_credits_select" ON public.building_credits
  FOR SELECT
  USING (
    public.is_admin()
    OR status <> 'hidden'::public.credit_status_enum
  );

CREATE POLICY "building_credits_insert" ON public.building_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (person_id IS NOT NULL OR company_id IS NOT NULL)
  );

CREATE POLICY "building_credits_update" ON public.building_credits
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.people p
      WHERE p.id = building_credits.person_id
        AND p.claimed_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = building_credits.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.people p
      WHERE p.id = building_credits.person_id
        AND p.claimed_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = building_credits.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "building_credits_delete" ON public.building_credits
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.buildings b
      WHERE b.id = building_credits.building_id
        AND b.created_by = (SELECT auth.uid())
    )
  );
