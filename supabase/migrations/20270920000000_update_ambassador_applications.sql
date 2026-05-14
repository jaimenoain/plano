-- Add locality_id and interests to ambassador_applications
ALTER TABLE public.ambassador_applications 
  ADD COLUMN locality_id uuid REFERENCES public.localities (id),
  ADD COLUMN interests text[];

-- Make motivation_text and chapter_id optional
ALTER TABLE public.ambassador_applications 
  ALTER COLUMN motivation_text DROP NOT NULL,
  ALTER COLUMN chapter_id DROP NOT NULL;

-- Update submit_ambassador_application RPC to handle new fields and make motivation optional
CREATE OR REPLACE FUNCTION public.submit_ambassador_application (
  p_chapter_id uuid DEFAULT NULL,
  p_motivation_text text DEFAULT NULL,
  p_locality_id uuid DEFAULT NULL,
  p_interests text[] DEFAULT NULL
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = v_uid
      AND m.status = 'active') THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  -- If chapter_id is provided, validate it
  IF p_chapter_id IS NOT NULL AND NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters c
    WHERE
      c.id = p_chapter_id
      AND c.status IN ('active', 'forming')) THEN
    RAISE EXCEPTION 'invalid_chapter';
  END IF;

  INSERT INTO public.ambassador_applications (user_id, chapter_id, motivation_text, locality_id, interests)
    VALUES (v_uid, p_chapter_id, NULLIF(trim(p_motivation_text), ''), p_locality_id, p_interests)
  RETURNING
    id INTO v_app_id;

  -- Notify chapter leaders if chapter_id is provided
  IF p_chapter_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    SELECT
      m.user_id,
      v_uid,
      'ambassador_application_received'::text,
      jsonb_build_object('application_id', v_app_id, 'chapter_id', p_chapter_id)
    FROM
      public.ambassador_memberships m
    WHERE
      m.chapter_id = p_chapter_id
      AND m.status = 'active'
      AND m.role IN ('president', 'exco');
  END IF;

  RETURN v_app_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'pending_exists';
END;
$$;
