-- Optional profile header fields: practice name and personal website (user profile page).
-- RLS: existing profiles UPDATE policy already restricts to auth.uid() = id.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS firm text,
  ADD COLUMN IF NOT EXISTS website text;

COMMENT ON COLUMN public.profiles.firm IS 'Optional practice or firm name on the user profile (often shown for legacy verified architect linkage).';
COMMENT ON COLUMN public.profiles.website IS 'Optional website or portfolio URL on the user profile.';
