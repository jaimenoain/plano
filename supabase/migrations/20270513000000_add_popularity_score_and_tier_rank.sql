-- Create Enum for Tier Rank
CREATE TYPE public.building_tier_rank AS ENUM (
    'Top 1%',
    'Top 5%',
    'Top 10%',
    'Top 20%',
    'Standard'
);

-- Add popularity_score column
ALTER TABLE public.buildings
ADD COLUMN popularity_score INTEGER NOT NULL DEFAULT 0;

-- Add tier_rank column using the new Enum type
ALTER TABLE public.buildings
ADD COLUMN tier_rank public.building_tier_rank;

-- Create index on popularity_score for performant sorting
CREATE INDEX idx_buildings_popularity_score ON public.buildings (popularity_score DESC);

-- Create index on tier_rank for filtering
CREATE INDEX idx_buildings_tier_rank ON public.buildings (tier_rank);
