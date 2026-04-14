-- Events feature — Phase 1 Task 1.1: `events`, `event_buildings`, enums, indexes, RLS.
-- Apply via Supabase SQL Editor (never `supabase db push`). Depends on `people`, `companies`, `buildings`, `profiles`, `auth.users`.
-- Note: `submitted_by_user_id` is NOT NULL; FK uses default NO ACTION (roadmap text suggested ON DELETE SET NULL, which would conflict).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.event_claim_status AS ENUM (
  'unclaimed',
  'pending',
  'claimed'
);

CREATE TYPE public.event_attendance_status AS ENUM (
  'interested',
  'going'
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  slug text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  address text,
  location geography (Point, 4326),
  external_link text,
  cover_image_url text,
  is_self_hosted boolean NOT NULL DEFAULT false,
  claim_status public.event_claim_status NOT NULL DEFAULT 'unclaimed'::public.event_claim_status,
  submitted_by_user_id uuid NOT NULL REFERENCES auth.users (id),
  organiser_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  organiser_person_id uuid REFERENCES public.people (id) ON DELETE SET NULL,
  organiser_company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_slug_key UNIQUE (slug),
  CONSTRAINT events_at_most_one_organiser_entity CHECK (
    (CASE WHEN organiser_user_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN organiser_person_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN organiser_company_id IS NOT NULL THEN 1 ELSE 0 END)
    <= 1
  )
);

CREATE INDEX idx_events_submitted_by ON public.events (submitted_by_user_id);

CREATE INDEX idx_events_organiser_user ON public.events (organiser_user_id)
  WHERE organiser_user_id IS NOT NULL;

CREATE INDEX idx_events_organiser_person ON public.events (organiser_person_id)
  WHERE organiser_person_id IS NOT NULL;

CREATE INDEX idx_events_organiser_company ON public.events (organiser_company_id)
  WHERE organiser_company_id IS NOT NULL;

CREATE INDEX idx_events_claim_status ON public.events (claim_status);

CREATE INDEX idx_events_start_at ON public.events (start_at);

CREATE INDEX idx_events_location ON public.events USING gist (location)
  WHERE location IS NOT NULL;

COMMENT ON TABLE public.events IS
  'Community events: submitter vs organiser (optional claim flow). Phase 1 Task 1.1.';

-- ---------------------------------------------------------------------------
-- event_buildings
-- ---------------------------------------------------------------------------

CREATE TABLE public.event_buildings (
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,

  CONSTRAINT event_buildings_pkey PRIMARY KEY (event_id, building_id)
);

CREATE INDEX idx_event_buildings_building_id ON public.event_buildings (building_id);

COMMENT ON TABLE public.event_buildings IS
  'Optional links between events and catalogued buildings. Phase 1 Task 1.1.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.events_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_touch_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: events
-- ---------------------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_public"
  ON public.events
  FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "events_insert_submitter"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by_user_id = (SELECT auth.uid()));

CREATE POLICY "events_update_submitter_or_admin"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'app_admin')
    )
  )
  WITH CHECK (
    submitted_by_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'app_admin')
    )
  );

CREATE POLICY "events_delete_admin"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'app_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: event_buildings
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_buildings_select_all"
  ON public.event_buildings
  FOR SELECT
  USING (true);

CREATE POLICY "event_buildings_insert_owner_or_admin"
  ON public.event_buildings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.submitted_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'app_admin')
    )
  );

CREATE POLICY "event_buildings_delete_owner_or_admin"
  ON public.event_buildings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_buildings.event_id
        AND e.submitted_by_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'app_admin')
    )
  );
