-- Rename 'watch_with' to 'visit_with' in recommendations table status check constraint

-- 1. Drop the existing constraint
ALTER TABLE public.recommendations DROP CONSTRAINT IF EXISTS recommendations_status_check;

-- 2. Update existing data
UPDATE public.recommendations
SET status = 'visit_with'
WHERE status = 'watch_with';

-- 3. Add the new constraint
ALTER TABLE public.recommendations
ADD CONSTRAINT recommendations_status_check
CHECK (status IN ('pending', 'accepted', 'ignored', 'visit_with'));
