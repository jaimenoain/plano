-- event_attendances: RSVP rows for community events (going / interested).
-- Apply via Supabase SQL Editor. Uses (SELECT auth.uid()) for write policies per project rules.
-- Safe if the table already exists (IF NOT EXISTS + idempotent policies).

CREATE TABLE IF NOT EXISTS public.event_attendances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status public.event_attendance_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_attendances_pkey PRIMARY KEY (id),
  CONSTRAINT event_attendances_event_user_key UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendances_event_id ON public.event_attendances (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_user_id ON public.event_attendances (user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_user_status ON public.event_attendances (user_id, status);

ALTER TABLE public.event_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_attendances_select_public" ON public.event_attendances;
CREATE POLICY "event_attendances_select_public"
  ON public.event_attendances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_attendances.event_id
        AND e.is_deleted = false
    )
  );

DROP POLICY IF EXISTS "event_attendances_insert_own" ON public.event_attendances;
CREATE POLICY "event_attendances_insert_own"
  ON public.event_attendances
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "event_attendances_update_own" ON public.event_attendances;
CREATE POLICY "event_attendances_update_own"
  ON public.event_attendances
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "event_attendances_delete_own" ON public.event_attendances;
CREATE POLICY "event_attendances_delete_own"
  ON public.event_attendances
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.event_attendances IS
  'Per-user RSVP for events (interested / going). Readable when parent event is not deleted.';

GRANT SELECT ON public.event_attendances TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_attendances TO authenticated;
