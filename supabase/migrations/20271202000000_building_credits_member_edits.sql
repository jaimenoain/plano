-- ============================================================================
-- Credit edits open to signed-in members (roadmap Task 2.2)
-- ============================================================================
-- Until now `building_credits_update` (20270822000000) granted UPDATE to three
-- principals only: `is_admin()`, the user who claimed the credited *person*,
-- and a steward of the credited *company*. Every other member could ADD a
-- credit (the insert policy accepts any authenticated user) but could never
-- correct one — not even the one they had just typed wrong.
--
-- That is out of step with the rest of the building record: `canEditOfficialData`
-- is `!!user`, so any member may already rewrite a building's name, address and
-- year. It is also the only rule that can reach the bulk-imported credits, which
-- carry `added_by_user_id IS NULL` and so have no author to fall back on — an
-- author-only rule would have left them editable by admins alone.
-- See docs/decisions/0031-credit-edits-open-to-members.md.
--
-- WHAT THE OPEN BRANCH DELIBERATELY DOES NOT COVER:
--   * Only `status = 'active'` rows. A `verified` credit was confirmed by the
--     credited party and a `flagged`/`hidden` one is under moderation; those
--     stay with the original three principals.
--   * `WITH CHECK` pins the *new* row to `status = 'active'` as well, so the
--     open branch cannot be used to self-verify or self-hide a credit — the
--     status transitions still belong to `updateCreditStatus` (admin) and
--     `flag_building_credit` (SECURITY DEFINER, 20270826000000).
--   * `WITH CHECK` cannot see OLD, so `building_id` and `added_by_user_id`,
--     which must merely stay *unchanged*, are pinned by the trigger below.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. UPDATE policy — the three original principals, plus members on active rows
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "building_credits_update" ON public.building_credits;

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
    -- Any signed-in member, but only on a credit nobody has verified or flagged.
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND building_credits.status = 'active'::public.credit_status_enum
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
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND building_credits.status = 'active'::public.credit_status_enum
      -- The insert policy has always required an entity; UPDATE never did, so a
      -- member could blank both columns and orphan the row. Closed here.
      AND (building_credits.person_id IS NOT NULL OR building_credits.company_id IS NOT NULL)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Provenance guard — the two columns a direct client write may never move
-- ---------------------------------------------------------------------------
-- RLS `WITH CHECK` sees only NEW, so "this column must not change" cannot be
-- expressed as a policy. The editorial columns (person_id, company_id, role,
-- role_custom, credit_tier, is_lead, contribution_notes, year_from, year_to,
-- project_url) are all freely editable — re-pointing a credit at the right
-- architect is the whole point of the task. `building_id` is not: moving a
-- credit to another building is how you would silently strip a building of its
-- architect, and no client code path has ever needed it.
--
-- WHY `current_user` AND NOT `auth.uid()`:
--   The moderation paths that legitimately rewrite these rows are all
--   SECURITY DEFINER functions owned by `postgres` — `flag_building_credit`,
--   `redeem_credit_removal_token`, `merge_buildings`, the ambassador approval
--   batches. Inside them `auth.uid()` is still the *member* who called the RPC,
--   so an auth.uid()-based guard would fire on the app's own moderation flows.
--   `current_user`, in contrast, is `authenticated` only for a direct
--   PostgREST table write and becomes `postgres` inside any of those functions.
--   The function is therefore SECURITY INVOKER on purpose: a SECURITY DEFINER
--   trigger would report its own owner and discriminate nothing.

CREATE OR REPLACE FUNCTION public.building_credits_guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.building_id IS DISTINCT FROM OLD.building_id THEN
    RAISE EXCEPTION 'building_credits: building_id cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.added_by_user_id IS DISTINCT FROM OLD.added_by_user_id THEN
    RAISE EXCEPTION 'building_credits: added_by_user_id cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger functions are never called through PostgREST and Postgres skips the
-- EXECUTE check when firing a trigger, so no role needs EXECUTE on this one.
REVOKE ALL ON FUNCTION public.building_credits_guard_protected_columns() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS building_credits_guard_protected_columns ON public.building_credits;

CREATE TRIGGER building_credits_guard_protected_columns
  BEFORE UPDATE ON public.building_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.building_credits_guard_protected_columns();

-- ---------------------------------------------------------------------------
-- 3. Audit trail — `credit_edited` joins the client-writable action types
-- ---------------------------------------------------------------------------
-- 20270834000000 whitelists the action_type values a signed-in user may write
-- to admin_audit_logs. Without this the edit's audit insert is rejected by RLS
-- and the mutation fails after the credit has already been written.

DROP POLICY IF EXISTS "entity_audit_logs_actor_insert" ON public.admin_audit_logs;

CREATE POLICY "entity_audit_logs_actor_insert" ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND action_type IN (
      'credit_added',
      'credit_edited',
      'credit_status_changed',
      'steward_removed'
    )
  );
