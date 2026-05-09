-- =============================================================
-- Award Edition Events
-- Adds award_edition_events table so admins can log key dates
-- for an award cycle (shortlist announcement, winner reveal,
-- ceremony, etc.) with an optional location per event.
-- Depends on: 20270876000000_awards_foundation.sql
--             20270900000000_award_admins.sql
-- =============================================================

-- ── 1. Enum ───────────────────────────────────────────────────

CREATE TYPE public.award_edition_event_type AS ENUM (
  'nominations_open',
  'nominations_close',
  'longlist_announcement',
  'shortlist_announcement',
  'winner_announcement',
  'ceremony',
  'other'
);

-- ── 2. Table ──────────────────────────────────────────────────

CREATE TABLE public.award_edition_events (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  edition_id  UUID        NOT NULL
              REFERENCES public.award_editions(id) ON DELETE CASCADE,
  event_type  public.award_edition_event_type NOT NULL,
  event_date  DATE        NOT NULL,
  location    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT award_edition_events_pkey PRIMARY KEY (id)
);

-- Index the FK used in every SELECT/write predicate.
CREATE INDEX award_edition_events_edition_id_idx ON public.award_edition_events(edition_id);
-- Index for upcoming-events queries (event_date >= today).
CREATE INDEX award_edition_events_event_date_idx  ON public.award_edition_events(event_date);

ALTER TABLE public.award_edition_events ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS ────────────────────────────────────────────────────
-- SELECT: publicly readable (matches award_editions pattern).
CREATE POLICY "award_edition_events_select" ON public.award_edition_events
  FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: platform admin OR the award admin whose
-- award owns this edition.
-- Re-uses plano_auth_is_award_admin_for_recipient which resolves
-- award_id via edition_id (SECURITY DEFINER — no recursion risk).

CREATE POLICY "award_edition_events_insert" ON public.award_edition_events
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR public.plano_auth_is_award_admin_for_recipient(edition_id)
  );

CREATE POLICY "award_edition_events_update" ON public.award_edition_events
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin_for_recipient(edition_id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin_for_recipient(edition_id));

CREATE POLICY "award_edition_events_delete" ON public.award_edition_events
  FOR DELETE USING (
    public.is_admin()
    OR public.plano_auth_is_award_admin_for_recipient(edition_id)
  );
