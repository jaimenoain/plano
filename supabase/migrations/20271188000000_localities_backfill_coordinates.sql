-- Backfill localities.lat / localities.lng from their buildings.
--
-- WHY: the columns have existed since the table was created but were never
-- populated — all 6,420 rows were NULL. Anything that wants to point a map at a
-- city (the city guide's "Explore map" action, share cards, future geo
-- features) had no centre to aim at.
--
-- HOW: the MEDIAN of the locality's geolocated buildings, not the mean. Plano's
-- building coordinates contain a tail of mis-geocoded rows, and a single
-- building dropped in the wrong country drags an average far out of town —
-- Barcelona's mean longitude was 1.73 (~25 km east, in open country) versus a
-- median of 2.17 (Plaça de Catalunya). The median ignores that tail.
--
-- Only NULL rows are touched, so any hand-curated or Places-sourced coordinate
-- set later always wins over this derived value. Localities with no geolocated
-- buildings stay NULL; the UI falls back to deriving a centre from whatever
-- buildings it has loaded.
--
-- types-neutral: data-only backfill. A single UPDATE of two existing nullable
-- columns — no table, column, type, function or constraint changes — so the
-- generated Supabase types are unaffected.

UPDATE localities AS l
SET lat = m.med_lat,
    lng = m.med_lng
FROM (
  SELECT
    b.locality_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY st_y(b.location::geometry)) AS med_lat,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY st_x(b.location::geometry)) AS med_lng
  FROM buildings AS b
  WHERE b.locality_id IS NOT NULL
    AND b.location IS NOT NULL
    AND b.is_deleted = false
  GROUP BY b.locality_id
) AS m
WHERE m.locality_id = l.id
  AND l.lat IS NULL
  AND l.lng IS NULL;
