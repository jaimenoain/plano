-- Embassy milestone recognition (Roadmap 3.3) — the four badges the roadmap names.
--
-- An ambassador earns: first_contribution, photos_10, moderations_50, streak_4.
-- public.sync_my_ambassador_milestones() evaluates all four against the caller's own
-- impact numbers, writes any newly-earned ones into the ambassador_milestones ledger,
-- announces each one exactly once as a 'milestone_earned' notification, and returns the
-- full catalogue (earned and not) with live progress so /embassy/impact can render a
-- shelf with "3 / 10" style progress. The client calls it on any Embassy workspace
-- visit; it is idempotent, so a re-call is a no-op.
--
-- ── Design notes ──
--
-- 1. NO SECOND COPY OF THE COUNTING SQL. This function does not count anything itself:
--    it selects one row from public.get_my_ambassador_impact(0) (timeline limit 0 —
--    the timeline is dead weight here). auth.uid() reads the per-request JWT GUC and is
--    unaffected by SECURITY DEFINER role switching, so the nested call is still
--    self-scoped to the same caller. This is deliberate: the badge must be judged on the
--    exact numbers the page renders, and 20271193000000's design note 1 records what
--    happens when three surfaces each grow their own definition of the same metric.
--    CONSEQUENCE: milestones inherit that function's semantics — global and all-time,
--    NOT chapter-scoped and NOT week-windowed like the weekly digest.
--
-- 2. THRESHOLDS LIVE HERE, NOT IN THE CLIENT. The function returns target + progress per
--    milestone, so the UI never re-derives "10" or "50" and cannot drift from the rule
--    that actually awards the badge. The client owns the copy (labels) and nothing else.
--
-- 3. THE LEDGER IS THE IDEMPOTENCY GUARD. PRIMARY KEY (user_id, key) + ON CONFLICT DO
--    NOTHING: the notification is driven off the INSERT's RETURNING, so it fires on the
--    statement that actually created the row and never again. The final SELECT reads
--    earned_at from that RETURNING for freshly-awarded rows — the statement snapshot
--    predates the insert, so the table itself cannot see them yet.
--
-- 4. SELF-ACTOR CONVENTION, as established by 20271193000000 design note 4:
--    notifications.actor_id is NOT NULL -> profiles(id) and this database has no system
--    profile, so a system-generated notification uses actor_id = user_id. Client code
--    must never interpolate actor.username for 'milestone_earned'.
--
-- 5. ONCE EARNED, ALWAYS EARNED. streak_4 stamps earned_at when the streak first reaches
--    four weeks and the row stays; `progress` still reports the *current* streak, so a
--    lapsed streak shows honestly on the shelf without revoking the badge.
--
-- 6. Known pre-existing gap, same as 20271184000000 / 20271185000000: video approvals tag
--    their audit row table_name='building_posts', so they are not counted as moderation
--    anywhere in the app — including toward moderations_50.

-- ─── 1. Ledger ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ambassador_milestones (
  user_id   uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  key       text        NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ambassador_milestones_pkey PRIMARY KEY (user_id, key)
);

COMMENT ON TABLE public.ambassador_milestones IS
  'Roadmap 3.3. One row per (ambassador, milestone) the moment it is first earned. Written only by sync_my_ambassador_milestones(); the row''s existence is what stops the notification from firing twice.';

ALTER TABLE public.ambassador_milestones ENABLE ROW LEVEL SECURITY;

-- Read-only to its owner. There is no INSERT/UPDATE/DELETE policy on purpose: awarding
-- is not something a client may assert, only something the SECURITY DEFINER function
-- below concludes from the impact numbers.
DROP POLICY IF EXISTS "Users read their own milestones" ON public.ambassador_milestones;
CREATE POLICY "Users read their own milestones"
  ON public.ambassador_milestones
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid ());

-- ─── 2. Notification type ─────────────────────────────────────────────────────
-- Re-declare the FULL notifications type set — the constraint is repeatedly dropped and
-- rebuilt, so the only safe way to append is to restate the whole list. The 24 below are
-- 20271193000000's list verbatim; restating a stale one silently breaks every type left
-- out of it (that is what 20270920200000 exists to repair).

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'follow', 'like', 'comment', 'recommendation', 'friend_joined', 'suggest_follow',
  'visit_request', 'architect_verification', 'ambassador_application_received',
  'ambassador_application_approved', 'ambassador_application_rejected',
  'ambassador_membership_review', 'award_win', 'feedback_status_updated',
  'feedback_notes_updated', 'project_idea_submitted', 'collection_collab_requested',
  'collection_collab_accepted', 'collection_collab_rejected', 'collection_collab_added',
  'contribution_approved', 'contribution_flagged', 'person_claimed',
  'weekly_digest', 'milestone_earned'
));

-- Per-type opt-out comes for free: the existing before_insert_notifications trigger drops
-- the row when profiles.notification_preferences ->> 'milestone_earned' = 'false'.

-- ─── 3. Evaluate + award + announce ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_my_ambassador_milestones ()
  RETURNS TABLE (
    milestone_key      text,
    milestone_target   integer,
    milestone_progress integer,
    earned_at          timestamptz,
    is_new             boolean)
  LANGUAGE plpgsql
  VOLATILE
  SECURITY DEFINER
  SET search_path = public
  AS $$
-- The OUT parameters are prefixed and this pragma is set because the query below joins a
-- table whose columns (key, earned_at) would otherwise be ambiguous against them inside
-- ON CONFLICT and RETURNING.
#variable_conflict use_column
DECLARE
  v_uid    uuid := auth.uid ();
  v_impact record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Design note 1: one nested call, no re-implemented counting.
  SELECT * INTO v_impact FROM public.get_my_ambassador_impact (0);

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH catalogue (key, label, target, progress) AS (
    VALUES
      -- Capped at 1: the impact totals deliberately overlap (edits_count includes
      -- moderation and research rows), so their raw sum is not a meaningful number —
      -- only "has this ambassador done anything at all" is.
      ('first_contribution'::text, 'First contribution'::text, 1,
        LEAST(
          v_impact.edits_count + v_impact.photos_count + v_impact.visits_count
          + v_impact.firms_claimed_count + v_impact.moderation_count
          + v_impact.outreach_count + v_impact.events_count + v_impact.research_count,
          1)),
      ('photos_10'::text,        '10 photos'::text,          10, v_impact.photos_count),
      ('moderations_50'::text,   '50 moderations'::text,     50, v_impact.moderation_count),
      ('streak_4'::text,         '4-week streak'::text,       4, v_impact.weekly_streak)
  ),
  awarded AS (
    INSERT INTO public.ambassador_milestones (user_id, key)
    SELECT v_uid, c.key
    FROM   catalogue c
    WHERE  c.progress >= c.target
    ON CONFLICT (user_id, key) DO NOTHING
    RETURNING ambassador_milestones.key, ambassador_milestones.earned_at
  ),
  -- Data-modifying CTEs always run to completion even when nothing reads them.
  announced AS (
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    SELECT
      v_uid,
      v_uid, -- self-actor: see design note 4
      'milestone_earned',
      jsonb_build_object(
        'milestone_key',      a.key,
        'milestone_label',    c.label,
        'milestone_progress', c.progress,
        'milestone_target',   c.target)
    FROM   awarded a
           INNER JOIN catalogue c ON c.key = a.key
    RETURNING 1
  )
  SELECT
    c.key,
    c.target,
    c.progress,
    COALESCE(a.earned_at, m.earned_at),
    (a.key IS NOT NULL)
  FROM   catalogue c
         LEFT JOIN awarded a ON a.key = c.key
         LEFT JOIN public.ambassador_milestones m
                ON m.user_id = v_uid AND m.key = c.key
  ORDER BY c.key;
END;
$$;

COMMENT ON FUNCTION public.sync_my_ambassador_milestones () IS
  'Roadmap 3.3. Self-scoped: evaluates the four milestones against get_my_ambassador_impact(), inserts newly-earned ones into ambassador_milestones, announces each exactly once as a milestone_earned notification, and returns the full catalogue with live progress. Idempotent.';

-- ─── 4. Grants ────────────────────────────────────────────────────────────────
--
-- REVOKE ... FROM PUBLIC is NOT sufficient on Supabase. This project has ALTER DEFAULT
-- PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, so every
-- new function is granted to those roles DIRECTLY at creation and revoking the PUBLIC
-- pseudo-role leaves those grants in place (#1671 shipped exactly that hole; #1672 was
-- the cleanup). Revoke by name, then grant back only what the browser needs.

REVOKE ALL ON FUNCTION public.sync_my_ambassador_milestones () FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_my_ambassador_milestones () TO authenticated;
