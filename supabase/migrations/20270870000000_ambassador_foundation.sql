-- Ambassador program foundation: chapters + memberships + helpers + RLS.
-- Apply via Supabase SQL Editor in timestamp order after prior migrations.

-- ── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE public.ambassador_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('local', 'national')),
  locality_id uuid REFERENCES public.localities (id),
  country_code text NOT NULL,
  parent_chapter_id uuid REFERENCES public.ambassador_chapters (id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'forming')),
  max_ambassadors integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ambassador_chapters_local_chapter_requires_locality CHECK (
    type = 'national' OR locality_id IS NOT NULL
  ),
  CONSTRAINT ambassador_chapters_national_chapter_no_parent CHECK (
    type = 'local' OR parent_chapter_id IS NULL
  ),
  CONSTRAINT ambassador_chapters_country_code_upper CHECK (
    country_code = upper(country_code) AND char_length(country_code) = 2
  ),
  CONSTRAINT ambassador_chapters_max_ambassadors_positive CHECK (max_ambassadors > 0)
);

CREATE INDEX ambassador_chapters_locality_id_idx ON public.ambassador_chapters (locality_id);
CREATE INDEX ambassador_chapters_parent_chapter_id_idx ON public.ambassador_chapters (parent_chapter_id);
CREATE INDEX ambassador_chapters_country_code_idx ON public.ambassador_chapters (country_code);

CREATE TABLE public.ambassador_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.ambassador_chapters (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('president', 'exco', 'ambassador')),
  exco_responsibility text CHECK (
    exco_responsibility IS NULL
    OR exco_responsibility IN (
      'content',
      'marketing',
      'architect_relations',
      'data_quality',
      'community'
    )
  ),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  invited_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ambassador_memberships_one_chapter_per_user UNIQUE (user_id),
  CONSTRAINT ambassador_memberships_exco_requires_responsibility CHECK (
    role <> 'exco' OR exco_responsibility IS NOT NULL
  ),
  CONSTRAINT ambassador_memberships_ambassador_no_exco_resp CHECK (
    role = 'exco' OR exco_responsibility IS NULL
  )
);

CREATE INDEX ambassador_memberships_user_id_idx ON public.ambassador_memberships (user_id);
CREATE INDEX ambassador_memberships_chapter_id_idx ON public.ambassador_memberships (chapter_id);

-- ── updated_at triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_chapters_touch_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ambassador_memberships_touch_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassador_chapters_touch_updated_at ON public.ambassador_chapters;

CREATE TRIGGER trg_ambassador_chapters_touch_updated_at
  BEFORE UPDATE ON public.ambassador_chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.ambassador_chapters_touch_updated_at ();

DROP TRIGGER IF EXISTS trg_ambassador_memberships_touch_updated_at ON public.ambassador_memberships;

CREATE TRIGGER trg_ambassador_memberships_touch_updated_at
  BEFORE UPDATE ON public.ambassador_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.ambassador_memberships_touch_updated_at ();

-- ── Helper functions (SECURITY DEFINER) ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_ambassador_membership ()
  RETURNS public.ambassador_memberships
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN (
    SELECT
      m.*
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = (SELECT auth.uid())
      AND m.status = 'active'
    LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_ambassador ()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = (SELECT auth.uid())
      AND m.status = 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_leader (p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = (SELECT auth.uid())
      AND m.chapter_id = p_chapter_id
      AND m.role IN ('president', 'exco')
      AND m.status = 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_president (p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = (SELECT auth.uid())
      AND m.chapter_id = p_chapter_id
      AND m.role = 'president'
      AND m.status = 'active');
END;
$$;

-- Public profile badge (role + chapter name only); callable without membership SELECT.
CREATE OR REPLACE FUNCTION public.get_ambassador_badge_for_profile (p_user_id uuid)
  RETURNS TABLE (
    ambassador_role text,
    chapter_name text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    m.role::text,
    c.name::text
  FROM
    public.ambassador_memberships m
    INNER JOIN public.ambassador_chapters c ON c.id = m.chapter_id
  WHERE
    m.user_id = p_user_id
    AND m.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_ambassador_membership () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_ambassador () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_chapter_leader (uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_chapter_president (uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_ambassador_badge_for_profile (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_ambassador_membership () TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_ambassador () TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_chapter_leader (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_chapter_president (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_ambassador_badge_for_profile (uuid) TO anon,
authenticated;

-- ── RLS: ambassador_chapters ──────────────────────────────────────────────

ALTER TABLE public.ambassador_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users select ambassador chapters"
  ON public.ambassador_chapters
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Admins insert ambassador chapters"
  ON public.ambassador_chapters
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update ambassador chapters"
  ON public.ambassador_chapters
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete ambassador chapters"
  ON public.ambassador_chapters
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── RLS: ambassador_memberships ───────────────────────────────────────────

ALTER TABLE public.ambassador_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassador memberships select"
  ON public.ambassador_memberships
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = (SELECT auth.uid())
    OR public.is_chapter_leader (chapter_id)
    OR EXISTS (
      SELECT
        1
      FROM
        public.ambassador_memberships my_m
        INNER JOIN public.ambassador_chapters my_national ON my_national.id = my_m.chapter_id
      WHERE
        my_m.user_id = (SELECT auth.uid())
        AND my_m.status = 'active'
        AND my_m.role = 'president'
        AND my_national.type = 'national'
        AND (
          ambassador_memberships.chapter_id = my_national.id
          OR EXISTS (
            SELECT
              1
            FROM
              public.ambassador_chapters tc
            WHERE
              tc.id = ambassador_memberships.chapter_id
              AND tc.parent_chapter_id IS NOT DISTINCT FROM my_national.id))));

CREATE POLICY "Admins insert ambassador memberships"
  ON public.ambassador_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update ambassador memberships"
  ON public.ambassador_memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Chapter leaders update ambassador memberships in chapter"
  ON public.ambassador_memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_chapter_leader (chapter_id))
  WITH CHECK (public.is_chapter_leader (chapter_id));

CREATE POLICY "Admins delete ambassador memberships"
  ON public.ambassador_memberships
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT ON TABLE public.ambassador_chapters TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.ambassador_chapters TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ambassador_memberships TO authenticated;
