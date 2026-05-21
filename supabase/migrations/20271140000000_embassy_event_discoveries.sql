-- Embassy Events — Slice 0: schema foundation.
-- Feedback id: bd9ec23f-3568-4d75-a860-d5a91f39f6db.
--
-- Adds the AI-driven event discovery queue. Three artefacts:
--   1. embassy_event_discoveries  — review queue (one row per AI candidate)
--   2. embassy_event_search_runs  — audit log of search invocations
--   3. ambassador_chapters.last_event_search_at  — cheap stale-check column
--
-- Writes (INSERT/DELETE on discoveries, INSERT/UPDATE on runs, the
-- last_event_search_at stamp) happen via SECURITY DEFINER RPCs that arrive in
-- Slice 1 (migration 20271141000000). RLS here is therefore:
--   - SELECT: any active chapter member or admin
--   - UPDATE: any active chapter member or admin (so the UI can edit
--             discovery fields before publishing — Slice 3)
--   - INSERT/DELETE: admin only (definer-rights RPCs bypass RLS anyway)
--
-- Helper public._ambassador_can_access_chapter(uuid) already returns true for
-- both active members and admins, so SELECT/UPDATE use it directly.

-- ── 1. Stale-check column on ambassador_chapters ──────────────────────────

ALTER TABLE public.ambassador_chapters
  ADD COLUMN IF NOT EXISTS last_event_search_at timestamptz NULL;

COMMENT ON COLUMN public.ambassador_chapters.last_event_search_at IS
  'Most recent successful AI event-search run for this chapter. Updated by the
   search RPC on success. Used by the /embassy/* visit trigger to gate
   serper+Claude calls to once per 4 days per chapter.';

-- ── 2. embassy_event_discoveries ──────────────────────────────────────────

CREATE TABLE public.embassy_event_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.ambassador_chapters (id) ON DELETE CASCADE,
  locality_id uuid NULL REFERENCES public.localities (id) ON DELETE SET NULL,

  title text NOT NULL,
  description text NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NULL,
  address text NULL,
  lat double precision NULL,
  lng double precision NULL,
  external_link text NULL,
  cover_image_url text NULL,

  source_url text NOT NULL,
  snippet text NULL,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'discarded')),

  duplicate_of_event_id uuid NULL REFERENCES public.events (id) ON DELETE SET NULL,
  published_event_id uuid NULL REFERENCES public.events (id) ON DELETE SET NULL,

  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_embassy_event_discoveries_chapter_status_created
  ON public.embassy_event_discoveries (chapter_id, status, created_at DESC);

CREATE INDEX idx_embassy_event_discoveries_duplicate_of
  ON public.embassy_event_discoveries (duplicate_of_event_id)
  WHERE duplicate_of_event_id IS NOT NULL;

CREATE INDEX idx_embassy_event_discoveries_start_at
  ON public.embassy_event_discoveries (start_at);

COMMENT ON TABLE public.embassy_event_discoveries IS
  'Staging queue of AI-discovered architecture events awaiting ambassador
   review. Rows are inserted by the event-search RPC, mutated by ambassadors
   (publish/discard/edit) via SECURITY DEFINER RPCs.';

-- ── 3. embassy_event_search_runs ─────────────────────────────────────────

CREATE TABLE public.embassy_event_search_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.ambassador_chapters (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  items_found integer NULL,
  error text NULL
);

CREATE INDEX idx_embassy_event_search_runs_chapter_started
  ON public.embassy_event_search_runs (chapter_id, started_at DESC);

COMMENT ON TABLE public.embassy_event_search_runs IS
  'Audit history of AI event-search invocations. One row per attempted run
   (success or failure). Used to surface "last searched" UI state and for
   ops diagnostics.';

-- ── 4. RLS — embassy_event_discoveries ───────────────────────────────────

ALTER TABLE public.embassy_event_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embassy_event_discoveries_select_chapter_or_admin"
  ON public.embassy_event_discoveries
  FOR SELECT
  TO authenticated
  USING (public._ambassador_can_access_chapter (chapter_id));

CREATE POLICY "embassy_event_discoveries_update_chapter_or_admin"
  ON public.embassy_event_discoveries
  FOR UPDATE
  TO authenticated
  USING (public._ambassador_can_access_chapter (chapter_id))
  WITH CHECK (public._ambassador_can_access_chapter (chapter_id));

CREATE POLICY "embassy_event_discoveries_insert_admin"
  ON public.embassy_event_discoveries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin ());

CREATE POLICY "embassy_event_discoveries_delete_admin"
  ON public.embassy_event_discoveries
  FOR DELETE
  TO authenticated
  USING (public.is_admin ());

-- ── 5. RLS — embassy_event_search_runs ───────────────────────────────────

ALTER TABLE public.embassy_event_search_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embassy_event_search_runs_select_chapter_or_admin"
  ON public.embassy_event_search_runs
  FOR SELECT
  TO authenticated
  USING (public._ambassador_can_access_chapter (chapter_id));

CREATE POLICY "embassy_event_search_runs_insert_admin"
  ON public.embassy_event_search_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin ());

CREATE POLICY "embassy_event_search_runs_update_admin"
  ON public.embassy_event_search_runs
  FOR UPDATE
  TO authenticated
  USING (public.is_admin ())
  WITH CHECK (public.is_admin ());

CREATE POLICY "embassy_event_search_runs_delete_admin"
  ON public.embassy_event_search_runs
  FOR DELETE
  TO authenticated
  USING (public.is_admin ());

-- ── 6. Grants ────────────────────────────────────────────────────────────

GRANT SELECT, UPDATE ON public.embassy_event_discoveries TO authenticated;
GRANT ALL ON public.embassy_event_discoveries TO service_role;

GRANT SELECT ON public.embassy_event_search_runs TO authenticated;
GRANT ALL ON public.embassy_event_search_runs TO service_role;
