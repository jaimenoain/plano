-- =============================================================
-- Award Edition Label & Slug (Phase 2)
-- Adds edition_label, edition_number, and slug to award_editions.
--
-- edition_label: human-readable name used instead of a year
--   e.g. "XVI", "Spring 2024", "2024 — Asia Pacific"
-- edition_number: ordinal integer for ordering when year is absent
--   e.g. 16 (for BEAU XVI)
-- slug: URL-safe identifier, unique per award
--   auto-populated from year for existing rows; must be set on
--   new year-less editions
--
-- Constraint change: year OR edition_label must be present
--   (previously required year OR edition_date)
-- =============================================================

ALTER TABLE public.award_editions
  ADD COLUMN edition_label  TEXT,
  ADD COLUMN edition_number INTEGER,
  ADD COLUMN slug           TEXT;

-- Back-fill slug from year for all existing editions that have a year.
UPDATE public.award_editions
SET slug = year::TEXT
WHERE year IS NOT NULL;

-- Drop old "year or date" constraint; replace with "year or label".
ALTER TABLE public.award_editions
  DROP CONSTRAINT award_editions_year_or_date;

ALTER TABLE public.award_editions
  ADD CONSTRAINT award_editions_year_or_label CHECK (
    year IS NOT NULL OR edition_label IS NOT NULL
  );

-- Per-award uniqueness for slug (partial — only when slug is set).
CREATE UNIQUE INDEX award_editions_award_slug_uidx
  ON public.award_editions (award_id, slug)
  WHERE slug IS NOT NULL;

-- Fast lookup by slug within an award.
CREATE INDEX award_editions_slug_idx ON public.award_editions (slug);

-- Allow ordering by edition_number when year is absent.
CREATE INDEX award_editions_edition_number_idx
  ON public.award_editions (edition_number DESC NULLS LAST);
