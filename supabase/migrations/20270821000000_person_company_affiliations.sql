-- Task 1.3 (Roadmap): `person_company_affiliations`, migrate from `architect_affiliations`.
-- Depends on `people` (20270819) and `companies` (20270820). Apply via Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- person_company_affiliations
-- ---------------------------------------------------------------------------

CREATE TABLE public.person_company_affiliations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  company_id uuid NOT NULL,
  year_from integer,
  year_to integer,
  role_note text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_company_affiliations_pkey PRIMARY KEY (id),
  CONSTRAINT person_company_affiliations_person_id_company_id_key
    UNIQUE (person_id, company_id),
  CONSTRAINT person_company_affiliations_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people (id) ON DELETE CASCADE,
  CONSTRAINT person_company_affiliations_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE,
  CONSTRAINT person_company_affiliations_year_from_reasonable
    CHECK (year_from IS NULL OR (year_from >= 1000 AND year_from <= 2100)),
  CONSTRAINT person_company_affiliations_year_to_reasonable
    CHECK (year_to IS NULL OR (year_to >= 1000 AND year_to <= 2100)),
  CONSTRAINT person_company_affiliations_year_range_sensible
    CHECK (year_from IS NULL OR year_to IS NULL OR year_to >= year_from)
);

CREATE INDEX person_company_affiliations_person_id_idx
  ON public.person_company_affiliations (person_id);
CREATE INDEX person_company_affiliations_company_id_idx
  ON public.person_company_affiliations (company_id);

COMMENT ON TABLE public.person_company_affiliations IS
  'Links people to companies (studio practice); migrated from architect_affiliations (Building Credits v2 Task 1.3).';

-- ---------------------------------------------------------------------------
-- Data: studio_id -> company_id, individual_id -> person_id
-- Rows whose endpoints are not both in companies/people are skipped (data integrity).
-- ---------------------------------------------------------------------------

INSERT INTO public.person_company_affiliations (
  person_id,
  company_id,
  year_from,
  year_to,
  role_note,
  created_at
)
SELECT
  aa.individual_id,
  aa.studio_id,
  NULL::integer,
  NULL::integer,
  NULL::text,
  aa.created_at
FROM public.architect_affiliations aa
WHERE EXISTS (SELECT 1 FROM public.people p WHERE p.id = aa.individual_id)
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = aa.studio_id);

-- ---------------------------------------------------------------------------
-- RLS: public read; authenticated insert; update/delete by claim owner, steward, or admin
-- ---------------------------------------------------------------------------

ALTER TABLE public.person_company_affiliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_company_affiliations_select" ON public.person_company_affiliations
  FOR SELECT
  USING (true);

CREATE POLICY "person_company_affiliations_insert" ON public.person_company_affiliations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "person_company_affiliations_update" ON public.person_company_affiliations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.people p
      WHERE p.id = person_company_affiliations.person_id
        AND p.claimed_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = person_company_affiliations.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.people p
      WHERE p.id = person_company_affiliations.person_id
        AND p.claimed_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = person_company_affiliations.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "person_company_affiliations_delete" ON public.person_company_affiliations
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.people p
      WHERE p.id = person_company_affiliations.person_id
        AND p.claimed_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = person_company_affiliations.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );
