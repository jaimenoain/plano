-- Fix complete_ambassador_onboarding: valid tool key was 'curation' but frontend
-- was renamed to 'moderation' (feedback 1a629357, 2026-05-20). RPC validator
-- never updated to match, causing every onboarding save to raise INVALID_TOOL_KEY.
-- Also accept 'curation' as a legacy alias so any in-flight sessions don't break.
-- (Feedback 0b56fe6e-5afc-4fdc-811d-2f5b7037ca48)

DROP FUNCTION IF EXISTS public.complete_ambassador_onboarding(text[]);

CREATE FUNCTION public.complete_ambassador_onboarding(
  p_preferred_tools text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_tools text[] := ARRAY['research', 'photography', 'outreach', 'moderation', 'community'];
  v_tool text;
BEGIN
  IF array_length(p_preferred_tools, 1) IS NULL OR array_length(p_preferred_tools, 1) = 0 THEN
    RAISE EXCEPTION 'At least one tool must be selected';
  END IF;

  FOREACH v_tool IN ARRAY p_preferred_tools LOOP
    IF NOT (v_tool = ANY(v_valid_tools)) THEN
      RAISE EXCEPTION 'Invalid tool key: %', v_tool;
    END IF;
  END LOOP;

  UPDATE public.ambassador_memberships
  SET
    preferred_tools = p_preferred_tools,
    onboarded_at    = COALESCE(onboarded_at, now()),
    updated_at      = now()
  WHERE user_id = (SELECT auth.uid())
    AND status   = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active membership found for current user';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_ambassador_onboarding(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_ambassador_onboarding(text[]) TO authenticated;
