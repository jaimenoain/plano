-- ============================================================
-- Plano Updates — blog posts authored by super admins
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plano_updates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  slug           text        NOT NULL UNIQUE,
  excerpt        text,
  body           text,
  hero_image_url text,
  tags           text[]      NOT NULL DEFAULT '{}',
  geo_scope      text        NOT NULL DEFAULT 'global'
                               CHECK (geo_scope IN ('global', 'national', 'local')),
  country_code   text,
  locality_id    uuid        REFERENCES public.localities(id) ON DELETE SET NULL,
  published_at   timestamptz,
  author_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Touch trigger
CREATE OR REPLACE FUNCTION public._touch_plano_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER plano_updates_touch
  BEFORE UPDATE ON public.plano_updates
  FOR EACH ROW EXECUTE FUNCTION public._touch_plano_updates();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.plano_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "plano_updates_public_read"
  ON public.plano_updates FOR SELECT
  TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now());

-- Admins can read all (including drafts)
CREATE POLICY "plano_updates_admin_read_all"
  ON public.plano_updates FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can insert
CREATE POLICY "plano_updates_admin_insert"
  ON public.plano_updates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update
CREATE POLICY "plano_updates_admin_update"
  ON public.plano_updates FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete
CREATE POLICY "plano_updates_admin_delete"
  ON public.plano_updates FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── Storage bucket: plano-updates ────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('plano-updates', 'plano-updates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "plano_updates_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plano-updates');

CREATE POLICY "plano_updates_images_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'plano-updates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'app_admin')
    )
  );

CREATE POLICY "plano_updates_images_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'plano-updates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'app_admin')
    )
  );

CREATE POLICY "plano_updates_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'plano-updates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'app_admin')
    )
  );
