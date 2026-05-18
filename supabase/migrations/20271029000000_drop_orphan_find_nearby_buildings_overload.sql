-- Drop orphaned 3-argument overload of find_nearby_buildings.
--
-- The original migration (20260421000001) created a 3-arg function:
--   find_nearby_buildings(lat, long, radius_meters)
-- Later migrations introduced a 4-arg variant with name_query, but a stale
-- copy of the 3-arg version remained in the live DB. PostgREST refuses to
-- dispatch RPC calls when two overloads accept the same supplied params:
--   PGRST203 — Could not choose the best candidate function between:
--     public.find_nearby_buildings(lat, long, radius_meters),
--     public.find_nearby_buildings(lat, long, radius_meters, name_query)
--
-- The 4-arg version (with name_query defaulting to NULL) covers every
-- caller, so the 3-arg overload is safe to drop.

DROP FUNCTION IF EXISTS public.find_nearby_buildings(double precision, double precision, double precision);
