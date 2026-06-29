-- Authenticated user claims an unclaimed `events` row as its organiser.
-- RLS `events_update_submitter_or_admin` only lets the submitter or an admin update events;
-- this RPC performs the first claim under SECURITY DEFINER with explicit guards. Mirrors
-- `claim_person` (20270828000000_claim_person_rpc.sql).
--
-- Identity options (p_organiser_kind):
--   'user'    -> organiser_user_id = caller, is_self_hosted = true (p_organiser_id ignored)
--   'person'  -> organiser_person_id = p_organiser_id; caller must own that person (people.claimed_by_user_id)
--   'company' -> organiser_company_id = p_organiser_id; caller must be a steward (company_stewards.user_id)
--
-- Claim is immediate (claim_status -> 'claimed'). At most one organiser FK may be set
-- (enforced by events_at_most_one_organiser_entity).

CREATE OR REPLACE FUNCTION public.claim_event(
  p_event_id uuid,
  p_organiser_kind text,
  p_organiser_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.events%ROWTYPE;
  v_already_mine boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_organiser_kind NOT IN ('user', 'person', 'company') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kind');
  END IF;

  SELECT * INTO v_row FROM public.events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND OR v_row.is_deleted THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Idempotency: caller re-claims an event already claimed to their resolved identity.
  IF v_row.claim_status = 'claimed'::public.event_claim_status THEN
    IF p_organiser_kind = 'user' AND v_row.organiser_user_id = v_uid THEN
      v_already_mine := true;
    ELSIF p_organiser_kind = 'person' AND v_row.organiser_person_id = p_organiser_id
      AND EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = p_organiser_id AND pe.claimed_by_user_id = v_uid
      ) THEN
      v_already_mine := true;
    ELSIF p_organiser_kind = 'company' AND v_row.organiser_company_id = p_organiser_id
      AND EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = p_organiser_id AND cs.user_id = v_uid
      ) THEN
      v_already_mine := true;
    END IF;

    IF v_already_mine THEN
      RETURN jsonb_build_object('ok', true, 'event_id', p_event_id);
    END IF;
  END IF;

  -- Only unclaimed events with no organiser set can be claimed.
  IF v_row.claim_status <> 'unclaimed'::public.event_claim_status
     OR v_row.organiser_user_id IS NOT NULL
     OR v_row.organiser_person_id IS NOT NULL
     OR v_row.organiser_company_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF p_organiser_kind = 'user' THEN
    UPDATE public.events
    SET organiser_user_id = v_uid,
        is_self_hosted = true,
        claim_status = 'claimed'::public.event_claim_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_event_id;

  ELSIF p_organiser_kind = 'person' THEN
    IF p_organiser_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = p_organiser_id AND pe.claimed_by_user_id = v_uid
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
    END IF;

    UPDATE public.events
    SET organiser_person_id = p_organiser_id,
        is_self_hosted = false,
        claim_status = 'claimed'::public.event_claim_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_event_id;

  ELSE -- 'company'
    IF p_organiser_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.company_stewards cs
      WHERE cs.company_id = p_organiser_id AND cs.user_id = v_uid
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
    END IF;

    UPDATE public.events
    SET organiser_company_id = p_organiser_id,
        is_self_hosted = false,
        claim_status = 'claimed'::public.event_claim_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_event_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'event_id', p_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_event(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_event(uuid, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.claim_event(uuid, text, uuid) IS
  'Claim an unclaimed event as organiser (kind: user|person|company). Immediate claim_status=claimed. Caller must own the person/company. Idempotent if caller already owns the claim.';
