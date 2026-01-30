-- Update the check constraint for categorization_method to include new methods
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_categorization_method_check;

ALTER TABLE public.collections
ADD CONSTRAINT collections_categorization_method_check
CHECK (categorization_method IN ('default', 'custom', 'status', 'rating_member'));
