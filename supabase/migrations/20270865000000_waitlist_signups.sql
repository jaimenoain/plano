-- Public waitlist for launch notifications (logged-out home CTA).
-- Apply via Supabase SQL Editor after prior migrations.

CREATE TABLE public.waitlist_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT waitlist_signups_email_len CHECK (char_length(trim(email)) BETWEEN 3 AND 320),
  CONSTRAINT waitlist_signups_full_name_len CHECK (
    full_name IS NULL OR (char_length(trim(full_name)) BETWEEN 1 AND 200)
  )
);

CREATE UNIQUE INDEX waitlist_signups_email_lower_key
  ON public.waitlist_signups (lower(trim(email)));

CREATE INDEX waitlist_signups_created_at_idx
  ON public.waitlist_signups (created_at DESC);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone may insert waitlist signup"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins select waitlist signups"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

GRANT INSERT ON TABLE public.waitlist_signups TO anon, authenticated;
GRANT SELECT ON TABLE public.waitlist_signups TO authenticated;
