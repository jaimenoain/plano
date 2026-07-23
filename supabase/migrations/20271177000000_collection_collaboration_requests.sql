-- Collection collaboration requests: table, partial unique index, RLS, notification
-- types, and submit/review RPCs. Lets a logged-in non-collaborator ask a collection
-- owner for edit access; the owner accepts (→ editor contributor) or rejects, and both
-- sides are notified. Modeled on 20270870100000_ambassador_applications.sql.

-- ── Notifications: extend allowed types ─────────────────────────────────────
-- Re-declare the FULL set (the constraint has been clobbered by rebuilds before);
-- superset of the last applied list (20271032000000_feedback_workflow.sql) plus the
-- TS-union member project_idea_submitted and the three new collection-collab types.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'follow',
    'like',
    'comment',
    'recommendation',
    'friend_joined',
    'suggest_follow',
    'visit_request',
    'architect_verification',
    'ambassador_application_received',
    'ambassador_application_approved',
    'ambassador_application_rejected',
    'ambassador_membership_review',
    'award_win',
    'feedback_status_updated',
    'feedback_notes_updated',
    'project_idea_submitted',
    'collection_collab_requested',
    'collection_collab_accepted',
    'collection_collab_rejected'
  ));

-- ── Table: collection_collaboration_requests ────────────────────────────────

CREATE TABLE public.collection_collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  reviewed_by uuid REFERENCES public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- At most one open request per (collection, requester).
CREATE UNIQUE INDEX collection_collab_req_one_pending
  ON public.collection_collaboration_requests (collection_id, requester_id)
  WHERE (status = 'pending');

CREATE INDEX collection_collab_req_collection_id_idx
  ON public.collection_collaboration_requests (collection_id);

CREATE INDEX collection_collab_req_requester_id_idx
  ON public.collection_collaboration_requests (requester_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.collection_collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Requester sees their own rows; collection owner sees requests for their collections.
CREATE POLICY "collection_collab_req_select"
  ON public.collection_collaboration_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
        AND c.owner_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON TABLE public.collection_collaboration_requests TO authenticated;

-- Inserts/updates flow only through the SECURITY DEFINER RPCs below.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.collection_collaboration_requests FROM authenticated;

-- ── collection_contributors: let a collaborator remove themselves ───────────
-- "Leave Collection" (CollectionSettingsDialog) was blocked by RLS: the original
-- policies only allowed the owner to delete contributor rows. Allow self-removal.
CREATE POLICY "Contributors can leave a collection"
  ON public.collection_contributors
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── RPC: request (validates, inserts, notifies owner) ───────────────────────

CREATE OR REPLACE FUNCTION public.request_collection_collaboration (
  p_collection_id uuid,
  p_message text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_collection public.collections;
  v_owner_username text;
  v_req_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_collection
  FROM public.collections
  WHERE id = p_collection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'collection_not_found';
  END IF;

  IF v_collection.owner_id = v_uid THEN
    RAISE EXCEPTION 'already_owner';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.collection_contributors cc
    WHERE cc.collection_id = p_collection_id
      AND cc.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'already_contributor';
  END IF;

  SELECT username INTO v_owner_username
  FROM public.profiles
  WHERE id = v_collection.owner_id;

  INSERT INTO public.collection_collaboration_requests (collection_id, requester_id, message)
    VALUES (p_collection_id, v_uid, NULLIF (trim(p_message), ''))
  RETURNING id INTO v_req_id;

  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_collection.owner_id,
      v_uid,
      'collection_collab_requested',
      jsonb_build_object(
        'request_id', v_req_id,
        'collection_id', p_collection_id,
        'collection_slug', v_collection.slug,
        'collection_name', v_collection.name,
        'owner_username', v_owner_username
      )
    );

  RETURN v_req_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'pending_exists';
END;
$$;

-- ── RPC: review (approve → editor contributor; notifies requester) ──────────

CREATE OR REPLACE FUNCTION public.review_collection_collaboration (
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.collection_collaboration_requests;
  v_collection public.collections;
  v_owner_username text;
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

  SELECT * INTO v_collection
  FROM public.collections
  WHERE id = v_req.collection_id;

  IF v_collection.owner_id <> v_uid THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'already_reviewed';
  END IF;

  SELECT username INTO v_owner_username
  FROM public.profiles
  WHERE id = v_collection.owner_id;

  IF p_approve THEN
    INSERT INTO public.collection_contributors (collection_id, user_id, role)
      VALUES (v_req.collection_id, v_req.requester_id, 'editor')
    ON CONFLICT (collection_id, user_id) DO UPDATE SET role = 'editor';

    UPDATE public.collection_collaboration_requests
    SET status = 'accepted',
        reviewed_by = v_uid,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
      VALUES (
        v_req.requester_id,
        v_uid,
        'collection_collab_accepted',
        jsonb_build_object(
          'request_id', p_request_id,
          'collection_id', v_req.collection_id,
          'collection_slug', v_collection.slug,
          'collection_name', v_collection.name,
          'owner_username', v_owner_username
        )
      );
  ELSE
    UPDATE public.collection_collaboration_requests
    SET status = 'rejected',
        reviewed_by = v_uid,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
      VALUES (
        v_req.requester_id,
        v_uid,
        'collection_collab_rejected',
        jsonb_build_object(
          'request_id', p_request_id,
          'collection_id', v_req.collection_id,
          'collection_slug', v_collection.slug,
          'collection_name', v_collection.name,
          'owner_username', v_owner_username,
          'reviewer_note', NULLIF (trim(p_note), '')
        )
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_collection_collaboration (uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.review_collection_collaboration (uuid, boolean, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_collection_collaboration (uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.review_collection_collaboration (uuid, boolean, text) TO authenticated;
