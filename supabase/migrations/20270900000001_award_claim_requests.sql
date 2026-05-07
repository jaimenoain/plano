-- =============================================================
-- Award Administration — Phase 2 of 2
-- Adds award_claim_requests table and the RPCs that drive the
-- admin-approved claim flow.
-- Depends on: 20270900000000_award_admins.sql
-- =============================================================

-- ── 1. award_claim_requests ──────────────────────────────────

CREATE TABLE public.award_claim_requests (
  id                UUID        NOT NULL DEFAULT gen_random_uuid(),
  award_id          UUID        NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  requester_user_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason            TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_note     TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT award_claim_requests_pkey PRIMARY KEY (id),
  CONSTRAINT award_claim_requests_reason_nonempty
    CHECK (length(trim(reason)) >= 20)
);

CREATE INDEX award_claim_requests_award_id_idx ON public.award_claim_requests(award_id);
CREATE INDEX award_claim_requests_status_idx   ON public.award_claim_requests(status);
CREATE INDEX award_claim_requests_user_idx     ON public.award_claim_requests(requester_user_id);

-- At most one pending request per user per award.
CREATE UNIQUE INDEX award_claim_requests_one_pending_per_user_award
  ON public.award_claim_requests(award_id, requester_user_id)
  WHERE status = 'pending';

ALTER TABLE public.award_claim_requests ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS — award_claim_requests ───────────────────────────

CREATE POLICY "award_claim_requests_select" ON public.award_claim_requests
  FOR SELECT USING (
    requester_user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- Authenticated users may insert their own pending request.
-- The unique partial index enforces "one pending per user per award".
CREATE POLICY "award_claim_requests_insert" ON public.award_claim_requests
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND requester_user_id = (SELECT auth.uid())
  );

-- Only platform admins update (approve / reject) via RPC.
CREATE POLICY "award_claim_requests_update" ON public.award_claim_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "award_claim_requests_delete" ON public.award_claim_requests
  FOR DELETE USING (public.is_admin());

-- ── 3. RPC: submit_award_claim_request ──────────────────────

CREATE OR REPLACE FUNCTION public.submit_award_claim_request(
  p_award_id uuid,
  p_reason   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_award     public.awards%ROWTYPE;
  v_req_id    uuid;
BEGIN
  -- Auth guard.
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Reason length.
  IF p_reason IS NULL OR length(trim(p_reason)) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reason_too_short');
  END IF;

  -- Award must exist.
  SELECT * INTO v_award FROM public.awards WHERE id = p_award_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'award_not_found');
  END IF;

  -- Award must be unclaimed.
  IF v_award.claim_status <> 'unclaimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  -- No existing pending request from this user for this award
  -- (the unique partial index makes this redundant but we return a
  -- clear error rather than letting Postgres raise a unique violation).
  IF EXISTS (
    SELECT 1 FROM public.award_claim_requests
    WHERE award_id = p_award_id
      AND requester_user_id = v_uid
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_pending');
  END IF;

  -- Insert the claim request.
  INSERT INTO public.award_claim_requests(award_id, requester_user_id, reason)
  VALUES (p_award_id, v_uid, trim(p_reason))
  RETURNING id INTO v_req_id;

  RETURN jsonb_build_object('ok', true, 'request_id', v_req_id);
END;
$$;

REVOKE ALL  ON FUNCTION public.submit_award_claim_request(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_award_claim_request(uuid, text) TO authenticated;

-- ── 4. RPC: review_award_claim_request ──────────────────────

CREATE OR REPLACE FUNCTION public.review_award_claim_request(
  p_request_id    uuid,
  p_approve       boolean,
  p_reviewer_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_req    public.award_claim_requests%ROWTYPE;
  v_award  public.awards%ROWTYPE;
BEGIN
  -- Platform admins only.
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Load request.
  SELECT * INTO v_req FROM public.award_claim_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found_or_not_pending');
  END IF;

  IF p_approve THEN
    -- Award must still be unclaimed.
    SELECT * INTO v_award FROM public.awards WHERE id = v_req.award_id FOR UPDATE;
    IF v_award.claim_status <> 'unclaimed' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'award_already_claimed');
    END IF;

    -- Create award_admins row (owner).
    INSERT INTO public.award_admins(award_id, user_id, role, invited_by)
    VALUES (v_req.award_id, v_req.requester_user_id, 'owner', NULL)
    ON CONFLICT (award_id, user_id) DO NOTHING;

    -- Mark award as claimed.
    UPDATE public.awards
    SET claim_status = 'claimed', updated_at = now()
    WHERE id = v_req.award_id;

    -- Mark request approved.
    UPDATE public.award_claim_requests
    SET status      = 'approved',
        reviewed_by = v_uid,
        reviewed_at = now(),
        updated_at  = now()
    WHERE id = p_request_id;

    -- Reject any other pending requests for the same award from other users.
    UPDATE public.award_claim_requests
    SET status      = 'rejected',
        reviewed_by = v_uid,
        reviewer_note = 'Another request for this award was approved.',
        reviewed_at = now(),
        updated_at  = now()
    WHERE award_id = v_req.award_id
      AND id <> p_request_id
      AND status = 'pending';

  ELSE
    -- Reject.
    UPDATE public.award_claim_requests
    SET status        = 'rejected',
        reviewed_by   = v_uid,
        reviewer_note = p_reviewer_note,
        reviewed_at   = now(),
        updated_at    = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL  ON FUNCTION public.review_award_claim_request(uuid, boolean, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.review_award_claim_request(uuid, boolean, text) TO authenticated;
