-- Remove legacy 4-argument overload so PostgREST can resolve get_discovery_feed
-- when the client sends only p_user_id, p_limit, p_offset (and optional filters).
-- Without this, "could not choose best candidate function" / ambiguous RPC errors
-- occur until a filter adds a parameter unique to the extended signature.

DROP FUNCTION IF EXISTS public.get_discovery_feed(uuid, int, int, text);
