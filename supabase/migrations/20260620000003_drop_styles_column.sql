-- Migration: Drop legacy styles column from buildings
ALTER TABLE buildings DROP COLUMN styles;
