-- outreach_log.ambassador_id currently references auth.users(id).
-- PostgREST cannot resolve `profiles!ambassador_id` without a direct FK to
-- public.profiles. Re-point the constraint so the join works.
ALTER TABLE public.outreach_log
  DROP CONSTRAINT IF EXISTS outreach_log_ambassador_id_fkey;

ALTER TABLE public.outreach_log
  ADD CONSTRAINT outreach_log_ambassador_id_fkey
  FOREIGN KEY (ambassador_id) REFERENCES public.profiles(id);
