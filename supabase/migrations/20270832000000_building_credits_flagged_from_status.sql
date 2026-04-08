-- Roadmap Phase 8 Task 8.1: record pre-flag status so admins can distinguish verified vs active
-- when moderating flagged credits (auto-hide countdown vs verified warning).
-- Apply via Supabase SQL Editor after prior credit migrations.

ALTER TABLE public.building_credits
  ADD COLUMN IF NOT EXISTS flagged_from_status public.credit_status_enum;

COMMENT ON COLUMN public.building_credits.flagged_from_status IS
  'When status = flagged: status immediately before flagging (active | verified). Set only by flag_building_credit.';

CREATE OR REPLACE FUNCTION public.flag_building_credit(
  p_credit_id uuid,
  p_reason public.credit_flag_reason_enum,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated int;
  v_notes text := NULLIF(trim(COALESCE(p_notes, '')), '');
BEGIN
  IF v_notes IS NOT NULL AND char_length(v_notes) > 10000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'notes_too_long');
  END IF;

  UPDATE public.building_credits bc
  SET
    flagged_from_status = bc.status,
    status = 'flagged'::public.credit_status_enum,
    flag_reason = p_reason,
    flag_notes = v_notes,
    flagged_at = timezone('utc', now()),
    flagged_by_user_id = (SELECT auth.uid()),
    updated_at = timezone('utc', now())
  WHERE bc.id = p_credit_id
    AND bc.status IN (
      'active'::public.credit_status_enum,
      'verified'::public.credit_status_enum
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_not_flaggable');
  END IF;

  RETURN jsonb_build_object('ok', true, 'credit_id', p_credit_id);
END;
$$;

COMMENT ON FUNCTION public.flag_building_credit(uuid, public.credit_flag_reason_enum, text) IS
  'Set building_credit to flagged with reason/notes; stores prior status in flagged_from_status; anon ok, flagged_by_user_id null when no JWT.';
