-- Migration ID: 20270803000000_add_tier_rank_enum.sql

-- Alter ENUM type to support 'Top 25%' instead of 'Top 20%'
ALTER TYPE public.building_tier_rank ADD VALUE IF NOT EXISTS 'Top 25%' AFTER 'Top 10%';
