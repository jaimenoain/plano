-- Phase 4 — Community
-- Migration: 20270878000000_awards_community.sql

-- 1. Table: award_recipient_suggestions
CREATE TABLE public.award_recipient_suggestions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by          UUID NOT NULL REFERENCES public.profiles(id),
  award_id              UUID NOT NULL REFERENCES public.awards(id),
  edition_id            UUID REFERENCES public.award_editions(id),
  category_id           UUID REFERENCES public.award_categories(id),
  recipient_type        TEXT NOT NULL
                        CHECK (recipient_type IN ('building','person','company')),
  recipient_building_id UUID REFERENCES public.buildings(id),
  recipient_person_id   UUID REFERENCES public.people(id),
  recipient_company_id  UUID REFERENCES public.companies(id),
  outcome               TEXT NOT NULL
                        CHECK (outcome IN (
                          'winner','finalist','shortlisted','longlisted',
                          'nominated','commended','highly_commended','special_mention'
                        )),
  year                  INTEGER,   -- suggested year (creates edition if not exists)
  source_url            TEXT,      -- link to verifiable source (required)
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
  reviewed_by           UUID REFERENCES auth.users(id),
  reviewer_note         TEXT,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT suggestions_single_target CHECK (
    (recipient_building_id IS NOT NULL)::INT +
    (recipient_person_id   IS NOT NULL)::INT +
    (recipient_company_id  IS NOT NULL)::INT = 1
  )
);

CREATE INDEX suggestions_status_idx       ON public.award_recipient_suggestions(status);
CREATE INDEX suggestions_submitted_by_idx ON public.award_recipient_suggestions(submitted_by);
CREATE INDEX suggestions_award_id_idx     ON public.award_recipient_suggestions(award_id);

-- 2. RLS: award_recipient_suggestions
ALTER TABLE public.award_recipient_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions; admins can see all.
CREATE POLICY "suggestions_select" ON public.award_recipient_suggestions
  FOR SELECT USING (
    submitted_by = auth.uid() OR public.is_admin()
  );

-- Any authenticated user can submit a suggestion.
CREATE POLICY "suggestions_insert" ON public.award_recipient_suggestions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
  );

-- Only admins can update (to approve/reject).
CREATE POLICY "suggestions_update" ON public.award_recipient_suggestions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. RPC: approve_award_suggestion
CREATE OR REPLACE FUNCTION public.approve_award_suggestion(p_suggestion_id UUID)
RETURNS UUID  -- returns the created award_recipients.id
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_suggestion  public.award_recipient_suggestions%ROWTYPE;
  v_edition_id  UUID;
  v_category_id UUID;
  v_recipient_id UUID;
BEGIN
  SELECT * INTO v_suggestion
  FROM public.award_recipient_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found or not pending';
  END IF;

  -- Resolve or create edition
  IF v_suggestion.edition_id IS NOT NULL THEN
    v_edition_id := v_suggestion.edition_id;
  ELSE
    SELECT id INTO v_edition_id FROM public.award_editions
    WHERE award_id = v_suggestion.award_id AND year = v_suggestion.year
    LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.award_editions(award_id, year)
      VALUES (v_suggestion.award_id, v_suggestion.year)
      RETURNING id INTO v_edition_id;
    END IF;
  END IF;

  -- Resolve category (default to first active category for this award)
  IF v_suggestion.category_id IS NOT NULL THEN
    v_category_id := v_suggestion.category_id;
  ELSE
    SELECT id INTO v_category_id FROM public.award_categories
    WHERE award_id = v_suggestion.award_id AND is_active = true
    ORDER BY created_at LIMIT 1;
  END IF;

  -- Insert recipient
  INSERT INTO public.award_recipients(
    edition_id, category_id, recipient_type,
    recipient_building_id, recipient_person_id, recipient_company_id,
    outcome, notes
  ) VALUES (
    v_edition_id, v_category_id, v_suggestion.recipient_type,
    v_suggestion.recipient_building_id,
    v_suggestion.recipient_person_id,
    v_suggestion.recipient_company_id,
    v_suggestion.outcome, v_suggestion.notes
  ) RETURNING id INTO v_recipient_id;

  -- Mark suggestion approved
  UPDATE public.award_recipient_suggestions
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_suggestion_id;

  RETURN v_recipient_id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.approve_award_suggestion(UUID) TO authenticated;
