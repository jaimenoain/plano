-- =============================================================
-- Award Administration — Phase 1 of 2
-- Adds award_admins table, claim_status on awards, and updated
-- RLS so award admins can write their own award data and review
-- community suggestions.
-- Depends on: 20270876000000_awards_foundation.sql
--             20270878000000_awards_community.sql
-- =============================================================

-- ── 1. Add claim_status to awards ────────────────────────────

ALTER TABLE public.awards
  ADD COLUMN claim_status public.person_claim_status NOT NULL DEFAULT 'unclaimed';

-- ── 2. award_admins ──────────────────────────────────────────
-- Mirrors company_stewards. role = owner (first claimant, full write)
-- or editor (invited by owner, full write, cannot transfer ownership).

CREATE TABLE public.award_admins (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  award_id   UUID        NOT NULL REFERENCES public.awards(id)   ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'owner'
             CHECK (role IN ('owner', 'editor')),
  invited_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT award_admins_pkey PRIMARY KEY (id),
  CONSTRAINT award_admins_award_user_key UNIQUE (award_id, user_id)
);

CREATE INDEX award_admins_award_id_idx ON public.award_admins(award_id);
CREATE INDEX award_admins_user_id_idx  ON public.award_admins(user_id);

ALTER TABLE public.award_admins ENABLE ROW LEVEL SECURITY;

-- ── 3. SECURITY DEFINER helper — avoids RLS recursion ────────
-- Mirrors plano_auth_is_company_steward from 20270839000000.

CREATE OR REPLACE FUNCTION public.plano_auth_is_award_admin(p_award_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.award_admins
    WHERE award_id = p_award_id
      AND user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL  ON FUNCTION public.plano_auth_is_award_admin(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.plano_auth_is_award_admin(uuid) TO authenticated;

-- ── 4. RLS — award_admins ────────────────────────────────────

CREATE POLICY "award_admins_select" ON public.award_admins
  FOR SELECT USING (
    public.is_admin()
    OR user_id = (SELECT auth.uid())
    OR public.plano_auth_is_award_admin(award_admins.award_id)
  );

-- Only platform admins may INSERT directly (claim RPC does this on behalf of the user).
CREATE POLICY "award_admins_insert" ON public.award_admins
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "award_admins_update" ON public.award_admins
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "award_admins_delete" ON public.award_admins
  FOR DELETE USING (public.is_admin());

-- ── 5. RLS — awards (add owner write) ───────────────────────
-- Award admins may UPDATE award metadata but NOT claim_status, slug, or id
-- (enforced by the BEFORE UPDATE trigger below).

DROP POLICY IF EXISTS "awards_update" ON public.awards;
CREATE POLICY "awards_update" ON public.awards
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin(id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin(id));

-- Prevent award admins from changing protected columns.
CREATE OR REPLACE FUNCTION public.awards_protect_immutable_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Platform admins may change anything.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin award admins may not touch slug, claim_status, or id.
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'award_admins may not change slug';
  END IF;
  IF NEW.claim_status IS DISTINCT FROM OLD.claim_status THEN
    RAISE EXCEPTION 'award_admins may not change claim_status';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'award_admins may not change id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER awards_protect_immutable_cols
  BEFORE UPDATE ON public.awards
  FOR EACH ROW EXECUTE FUNCTION public.awards_protect_immutable_cols();

-- ── 6. RLS — award_editions ──────────────────────────────────

DROP POLICY IF EXISTS "award_editions_insert" ON public.award_editions;
CREATE POLICY "award_editions_insert" ON public.award_editions
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR public.plano_auth_is_award_admin(award_id)
  );

DROP POLICY IF EXISTS "award_editions_update" ON public.award_editions;
CREATE POLICY "award_editions_update" ON public.award_editions
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin(award_id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin(award_id));

DROP POLICY IF EXISTS "award_editions_delete" ON public.award_editions;
CREATE POLICY "award_editions_delete" ON public.award_editions
  FOR DELETE USING (public.is_admin() OR public.plano_auth_is_award_admin(award_id));

-- ── 7. RLS — award_categories ───────────────────────────────

DROP POLICY IF EXISTS "award_categories_insert" ON public.award_categories;
CREATE POLICY "award_categories_insert" ON public.award_categories
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR public.plano_auth_is_award_admin(award_id)
  );

DROP POLICY IF EXISTS "award_categories_update" ON public.award_categories;
CREATE POLICY "award_categories_update" ON public.award_categories
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin(award_id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin(award_id));

DROP POLICY IF EXISTS "award_categories_delete" ON public.award_categories;
CREATE POLICY "award_categories_delete" ON public.award_categories
  FOR DELETE USING (public.is_admin() OR public.plano_auth_is_award_admin(award_id));

-- ── 8. RLS — award_recipients ───────────────────────────────
-- award_id must be resolved via the edition join.

CREATE OR REPLACE FUNCTION public.plano_auth_is_award_admin_for_recipient(p_edition_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.plano_auth_is_award_admin(
    (SELECT award_id FROM public.award_editions WHERE id = p_edition_id)
  );
$$;

REVOKE ALL  ON FUNCTION public.plano_auth_is_award_admin_for_recipient(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.plano_auth_is_award_admin_for_recipient(uuid) TO authenticated;

DROP POLICY IF EXISTS "award_recipients_insert" ON public.award_recipients;
CREATE POLICY "award_recipients_insert" ON public.award_recipients
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR public.plano_auth_is_award_admin_for_recipient(edition_id)
  );

DROP POLICY IF EXISTS "award_recipients_update" ON public.award_recipients;
CREATE POLICY "award_recipients_update" ON public.award_recipients
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin_for_recipient(edition_id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin_for_recipient(edition_id));

DROP POLICY IF EXISTS "award_recipients_delete" ON public.award_recipients;
CREATE POLICY "award_recipients_delete" ON public.award_recipients
  FOR DELETE USING (
    public.is_admin()
    OR public.plano_auth_is_award_admin_for_recipient(edition_id)
  );

-- ── 9. RLS — award_recipient_suggestions ────────────────────
-- Award admins can view and approve/reject suggestions for their award.

DROP POLICY IF EXISTS "suggestions_select" ON public.award_recipient_suggestions;
CREATE POLICY "suggestions_select" ON public.award_recipient_suggestions
  FOR SELECT USING (
    submitted_by = (SELECT auth.uid())
    OR public.is_admin()
    OR public.plano_auth_is_award_admin(award_id)
  );

DROP POLICY IF EXISTS "suggestions_update" ON public.award_recipient_suggestions;
CREATE POLICY "suggestions_update" ON public.award_recipient_suggestions
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin(award_id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin(award_id));

-- ── 10. Update approve_award_suggestion RPC ──────────────────
-- Allow award admins to approve suggestions for their own award,
-- not just platform admins.

CREATE OR REPLACE FUNCTION public.approve_award_suggestion(p_suggestion_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

  -- Authorisation: platform admin OR award admin for this award.
  IF NOT (
    public.is_admin()
    OR public.plano_auth_is_award_admin(v_suggestion.award_id)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Resolve or create edition.
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

  -- Resolve category.
  IF v_suggestion.category_id IS NOT NULL THEN
    v_category_id := v_suggestion.category_id;
  ELSE
    SELECT id INTO v_category_id FROM public.award_categories
    WHERE award_id = v_suggestion.award_id AND is_active = true
    ORDER BY created_at LIMIT 1;
  END IF;

  -- Insert recipient.
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

  -- Mark suggestion approved.
  UPDATE public.award_recipient_suggestions
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_suggestion_id;

  RETURN v_recipient_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_award_suggestion(UUID) TO authenticated;
