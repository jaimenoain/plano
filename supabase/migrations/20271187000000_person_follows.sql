-- Person ↔ user page alignment PR 2 — follow any person.
--
-- Visitors can follow a `people` row (claimed or not). While a person is
-- unclaimed, follows live in the dedicated `person_follows` join table; the
-- moment the person is claimed, `claim_person` converts those rows into real
-- user follows of the claimant (the person page then renders the ordinary
-- user FollowButton), notifies each converted follower with a new
-- `person_claimed` notification, and empties the table for that person. So
-- post-claim there is exactly one social graph — `person_follows` only ever
-- holds follows of unclaimed people.
--
-- Not a polymorphic extension of `follows` on purpose: both `follows` columns
-- FK to profiles, the table carries `is_close_friend`, and it is load-bearing
-- in feed/count RPCs. A twin table keeps FK integrity and dies gracefully.

-- ─── 1. Table ───────────────────────────────────────────────────────────────

CREATE TABLE public.person_follows (
  follower_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  person_id        uuid NOT NULL REFERENCES public.people(id)   ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_user_id, person_id)
);

CREATE INDEX person_follows_person_id_idx ON public.person_follows (person_id);

COMMENT ON TABLE public.person_follows IS
  'Follows of UNCLAIMED people. claim_person converts rows into follows of the claimant and deletes them.';

-- ─── 2. RLS (mirrors `follows`: publicly countable, self-managed) ───────────

ALTER TABLE public.person_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY person_follows_select ON public.person_follows
  FOR SELECT USING (true);

CREATE POLICY person_follows_insert ON public.person_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_user_id = (SELECT auth.uid()));

CREATE POLICY person_follows_delete ON public.person_follows
  FOR DELETE TO authenticated
  USING (follower_user_id = (SELECT auth.uid()));

-- ─── 3. Notification type ───────────────────────────────────────────────────
-- The constraint is repeatedly dropped/rebuilt; restate the FULL list
-- (superset of 20271183000000_contribution_outcome_notifications.sql) plus
-- the new `person_claimed` type.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'follow', 'like', 'comment', 'recommendation', 'friend_joined', 'suggest_follow',
  'visit_request', 'architect_verification', 'ambassador_application_received',
  'ambassador_application_approved', 'ambassador_application_rejected',
  'ambassador_membership_review', 'award_win', 'feedback_status_updated',
  'feedback_notes_updated', 'project_idea_submitted', 'collection_collab_requested',
  'collection_collab_accepted', 'collection_collab_rejected', 'collection_collab_added',
  'contribution_approved', 'contribution_flagged',
  'person_claimed'
));

-- ─── 4. claim_person — carry followers over ─────────────────────────────────
-- Body-only CREATE OR REPLACE; signature/return unchanged (types-neutral for
-- the RPC itself). Guards and idempotent early-returns keep their order, so a
-- re-claim by the current owner returns BEFORE the conversion block and never
-- re-fires notifications.

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

  -- Convert person followers into user followers of the claimant. The
  -- self-follow guard covers a claimant who had followed the unclaimed page.
  INSERT INTO public.follows (follower_id, following_id)
  SELECT pf.follower_user_id, v_uid
  FROM public.person_follows pf
  WHERE pf.person_id = p_person_id
    AND pf.follower_user_id <> v_uid
  ON CONFLICT DO NOTHING;

  -- Tell each converted follower the person they follow claimed the profile.
  -- Per-type opt-out applies via the notifications before-insert trigger.
  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
  SELECT
    pf.follower_user_id,
    v_uid,
    'person_claimed',
    jsonb_build_object(
      'person_id',   p_person_id,
      'person_name', v_row.name,
      'person_slug', v_row.slug
    )
  FROM public.person_follows pf
  WHERE pf.person_id = p_person_id
    AND pf.follower_user_id <> v_uid;

  -- One social graph post-claim.
  DELETE FROM public.person_follows WHERE person_id = p_person_id;

  RETURN jsonb_build_object('ok', true, 'person_id', p_person_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_person(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_person(uuid) TO authenticated;

COMMENT ON FUNCTION public.claim_person(uuid) IS
  'Claim an unclaimed person profile: set claimed_by_user_id/claim_status, convert person_follows into follows of the claimant, notify converted followers (person_claimed). One person per user. Idempotent if caller already owns this row.';
