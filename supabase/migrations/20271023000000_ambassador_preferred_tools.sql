-- Add preferred_tools column for multi-select onboarding preference
ALTER TABLE public.ambassador_memberships
  ADD COLUMN IF NOT EXISTS preferred_tools text[];

-- RPC for safe self-update of onboarding fields
-- (UPDATE RLS on ambassador_memberships only allows admins/leaders;
--  this definer-function lets any active member complete their own onboarding)
CREATE OR REPLACE FUNCTION public.complete_ambassador_onboarding(
  p_preferred_tools text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_tools text[] := ARRAY['research', 'photography', 'outreach', 'curation', 'community'];
  v_tool text;
BEGIN
  -- Validate every supplied tool key
  FOREACH v_tool IN ARRAY p_preferred_tools LOOP
    IF NOT (v_tool = ANY(v_valid_tools)) THEN
      RAISE EXCEPTION 'Invalid tool key: %', v_tool;
    END IF;
  END LOOP;

  IF array_length(p_preferred_tools, 1) IS NULL OR array_length(p_preferred_tools, 1) = 0 THEN
    RAISE EXCEPTION 'At least one tool must be selected';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.complete_ambassador_onboarding(text[]) TO authenticated;
