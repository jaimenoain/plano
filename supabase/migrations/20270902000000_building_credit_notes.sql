-- Migration: building_credit_notes
-- One note per building_credit where the credit owner can document their involvement.

CREATE TABLE public.building_credit_notes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  credit_id   uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  content     text        NOT NULL,
  image_urls  text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT building_credit_notes_pkey PRIMARY KEY (id),
  CONSTRAINT building_credit_notes_credit_id_key UNIQUE (credit_id),
  CONSTRAINT building_credit_notes_credit_id_fkey
    FOREIGN KEY (credit_id) REFERENCES public.building_credits(id) ON DELETE CASCADE,
  CONSTRAINT building_credit_notes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT building_credit_notes_content_length
    CHECK (char_length(content) <= 5000)
);

ALTER TABLE public.building_credit_notes ENABLE ROW LEVEL SECURITY;

-- Public can read notes whose credit is active or verified.
-- The note owner can always read their own note.
CREATE POLICY "building_credit_notes_select" ON public.building_credit_notes
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.building_credits bc
      WHERE bc.id = credit_id
        AND bc.status IN ('active', 'verified')
    )
  );

-- Only authenticated users can insert their own note.
CREATE POLICY "building_credit_notes_insert" ON public.building_credit_notes
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Only the note owner can update.
CREATE POLICY "building_credit_notes_update" ON public.building_credit_notes
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Only the note owner can delete.
CREATE POLICY "building_credit_notes_delete" ON public.building_credit_notes
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Auto-update updated_at on change.
CREATE OR REPLACE FUNCTION public.set_building_credit_note_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER building_credit_notes_updated_at
  BEFORE UPDATE ON public.building_credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_building_credit_note_updated_at();
