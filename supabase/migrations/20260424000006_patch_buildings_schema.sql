-- Patch Buildings Schema
-- 1. Add year_completed column (Integer, Nullable)
-- 2. Add comment on styles column

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year_completed INTEGER;

COMMENT ON COLUMN buildings.styles IS 'Array of architectural styles (e.g., ["Brutalist", "Modernism"]). Stored as Text[] to support multi-style buildings.';
