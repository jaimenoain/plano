-- One-time data backfill to populate profiles.verified_architect_id
-- for users who already have an approved architect claim.

UPDATE public.profiles p
SET verified_architect_id = ac.architect_id
FROM public.architect_claims ac
WHERE p.id = ac.user_id
  AND ac.status = 'approved';
