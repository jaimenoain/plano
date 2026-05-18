-- ambassador_goals: compute current_value dynamically.
--
-- The ambassador_goals.current_value column is never written to — no trigger,
-- no client code increments it. Goals on /embassy/goals therefore always
-- displayed 0 progress regardless of how many photos / edits / visits the
-- ambassador racked up. Rather than try to keep current_value in sync with
-- every relevant event (review_images insert, building_audit_logs insert,
-- user_buildings status flip, company_stewards owner insert), this RPC
-- derives the count at read time from the source tables, scoped to events
-- that happened on or after the goal was created.

CREATE OR REPLACE FUNCTION public.get_my_ambassador_goals ()
  RETURNS TABLE (
    id uuid,
    user_id uuid,
    title text,
    target_value integer,
    current_value integer,
    metric text,
    status text,
    due_date timestamptz,
    created_at timestamptz,
    updated_at timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid ();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    g.id,
    g.user_id,
    g.title,
    g.target_value,
    CASE g.metric
    WHEN 'photos' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.review_images ri
        WHERE
          ri.user_id = v_uid
          AND ri.created_at >= g.created_at), 0)
    WHEN 'edits' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.created_at >= g.created_at), 0)
    WHEN 'visits' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.user_buildings ub
        WHERE
          ub.user_id = v_uid
          AND ub.status::text = 'visited'
          AND COALESCE(ub.visited_at, ub.created_at) >= g.created_at), 0)
    WHEN 'firms_claimed' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.company_stewards cs
        WHERE
          cs.user_id = v_uid
          AND cs.role = 'owner'::public.company_steward_role
          AND cs.created_at >= g.created_at), 0)
    ELSE
      g.current_value
    END AS current_value,
    g.metric,
    g.status,
    g.due_date,
    g.created_at,
    g.updated_at
  FROM
    public.ambassador_goals g
  WHERE
    g.user_id = v_uid
  ORDER BY
    g.created_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ambassador_goals () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_goals () TO authenticated;
