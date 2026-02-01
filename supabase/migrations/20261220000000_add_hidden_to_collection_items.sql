-- Add is_hidden column to collection_items table
ALTER TABLE collection_items
ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
