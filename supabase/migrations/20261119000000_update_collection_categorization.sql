-- Add categorization_selected_members column to collections table
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS categorization_selected_members uuid[];

-- Note: We are assuming categorization_method is a text column or needs an enum update.
-- Since we cannot see the current definition, we assume text or that this migration
-- is sufficient to add the column needed for the new logic.
-- If categorization_method is an enum, you might need:
-- ALTER TYPE collection_categorization_method ADD VALUE 'status';
-- ALTER TYPE collection_categorization_method ADD VALUE 'rating_member';
