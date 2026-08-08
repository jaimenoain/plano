-- Task 5.8 — Markers: colour and size per categorization method (ADR 0033).
--
-- Adds a single nullable jsonb column, one per collection, holding the owner's
-- chosen colour+size per Categorization Method bucket:
--   { [method]: { [bucketKey]: { color: '#rrggbb', size: 'sm'|'md'|'lg' } } }
-- Parsed and validated client-side by src/features/collections/markerStyles.ts —
-- never trusted raw. NULL/partial values render exactly as before this task
-- (the parser merges over code-side defaults), so every existing collection is
-- unaffected until its owner opens the Markers tab and changes something.
--
-- No new table, so no new RLS: it rides the existing `collections` row-level
-- policies (owner/editor can update, everyone with read access can select).

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS marker_styles jsonb DEFAULT NULL;

COMMENT ON COLUMN public.collections.marker_styles IS
  'Owner-chosen marker colour+size per Categorization Method bucket (ADR 0033). '
  'Shape: { [method]: { [bucketKey]: { color, size } } }. Validate with '
  'src/features/collections/markerStyles.ts before use — never trust raw jsonb.';
