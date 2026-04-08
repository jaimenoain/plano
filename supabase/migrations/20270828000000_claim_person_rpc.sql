-- Roadmap Phase 7 Task 7.1: authenticated user claims an unclaimed `people` row.
-- RLS `people_update` only allows admin or existing claim owner; this RPC performs
-- the first claim under SECURITY DEFINER with explicit guards.
-- Apply via Supabase SQL Editor after prior people / credits migrations.

CREATE OR REPLACE FUNCTION public.claim_person(p_person_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.people%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.people p
    WHERE p.claimed_by_user_id = v_uid
      AND p.id <> p_person_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed_other');
  END IF;

  SELECT * INTO v_row FROM public.people WHERE id = p_person_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.claimed_by_user_id = v_uid AND v_row.claim_status = 'claimed'::public.person_claim_status THEN
    RETURN jsonb_build_object('ok', true, 'person_id', p_person_id);
  END IF;

  IF v_row.claim_status <> 'unclaimed'::public.person_claim_status OR v_row.claimed_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  UPDATE public.people
  SET
    claimed_by_user_id = v_uid,
    claim_status = 'claimed'::public.person_claim_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_person_id;

  RETURN jsonb_build_object('ok', true, 'person_id', p_person_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_person(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_person(uuid) TO authenticated;

COMMENT ON FUNCTION public.claim_person(uuid) IS
  'Claim an unclaimed person profile: set claimed_by_user_id and claim_status claimed. One person per user. Idempotent if caller already owns this row.';
