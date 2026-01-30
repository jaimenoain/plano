-- Add custom categorization columns to collections
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS categorization_method text DEFAULT 'default' CHECK (categorization_method IN ('default', 'custom')),
ADD COLUMN IF NOT EXISTS custom_categories jsonb DEFAULT '[]'::jsonb;

-- Add custom category ID to collection items
ALTER TABLE public.collection_items
ADD COLUMN IF NOT EXISTS custom_category_id text;

-- Add index for performance on custom category lookups
CREATE INDEX IF NOT EXISTS idx_collection_items_custom_category ON public.collection_items(custom_category_id);
