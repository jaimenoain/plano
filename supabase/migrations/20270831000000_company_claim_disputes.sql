-- Roadmap Phase 7 Task 7.4: dispute an existing company claim (admin resolution in Phase 8).
-- Apply via Supabase SQL Editor. Depends on companies, company_stewards, profiles.

CREATE TYPE public.company_claim_dispute_status AS ENUM ('open', 'resolved');

CREATE TABLE public.company_claim_disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  disputed_by_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence_url text,
  status public.company_claim_dispute_status NOT NULL DEFAULT 'open'::public.company_claim_dispute_status,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_claim_disputes_pkey PRIMARY KEY (id),
  CONSTRAINT company_claim_disputes_reason_nonempty CHECK (length(trim(reason)) > 0)
);

CREATE UNIQUE INDEX company_claim_disputes_one_open_per_user_company
  ON public.company_claim_disputes (company_id, disputed_by_user_id)
  WHERE status = 'open'::public.company_claim_dispute_status;

CREATE INDEX company_claim_disputes_company_id_idx
  ON public.company_claim_disputes (company_id);

CREATE INDEX company_claim_disputes_disputed_by_user_id_idx
  ON public.company_claim_disputes (disputed_by_user_id);

ALTER TABLE public.company_claim_disputes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.company_claim_disputes IS
  'User-submitted disputes over company ownership; admin resolves manually (Phase 8).';

-- SELECT: submitter sees own rows; admins see all (for future admin UI)
CREATE POLICY "company_claim_disputes_select" ON public.company_claim_disputes
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR disputed_by_user_id = (SELECT auth.uid())
  );

-- INSERT: signed-in non-steward on a claimed company; disputant must be self
CREATE POLICY "company_claim_disputes_insert" ON public.company_claim_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    disputed_by_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_claim_disputes.company_id
        AND c.claim_status = 'claimed'::public.person_claim_status
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_claim_disputes.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

-- UPDATE: admins resolve disputes (Phase 8 UI)
CREATE POLICY "company_claim_disputes_update" ON public.company_claim_disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
