-- Withdraw a pending collection-collaboration request. Lets the requester undo their
-- own request (roadmap Task 5.2 — toast Undo, a few seconds after requesting). Deletes
-- the row outright rather than marking it "withdrawn" so the partial unique index
-- collection_collab_req_one_pending (WHERE status = 'pending') stays free for a
-- re-request, and so no new status value / notification type needs to be introduced.
-- Modeled on request_collection_collaboration in
-- 20271177000000_collection_collaboration_requests.sql.

CREATE OR REPLACE FUNCTION public.withdraw_collection_collaboration (
  p_request_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.collection_collaboration_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_req
  FROM public.collection_collaboration_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  IF v_req.requester_id <> v_uid THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'already_reviewed';
  END IF;

  -- Remove the owner's already-inserted notification first, so an undone request
  -- never surfaces to them, then the request row itself.
  DELETE FROM public.notifications
  WHERE type = 'collection_collab_requested'
    AND metadata ->> 'request_id' = p_request_id::text;

  DELETE FROM public.collection_collaboration_requests
  WHERE id = p_request_id;
END;
$$;

-- `public` alone is not default-deny here — anon and authenticated hold DIRECT
-- grants from ALTER DEFAULT PRIVILEGES, so they must be named (see
-- _TEMPLATE_rpc.sql.txt). Note this is stricter than the sibling RPCs in
-- 20271177000000, which only revoke from PUBLIC.
REVOKE ALL ON FUNCTION public.withdraw_collection_collaboration (uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.withdraw_collection_collaboration (uuid) TO authenticated;
