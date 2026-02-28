-- Create ENUM types for new access dimensions
CREATE TYPE building_access_level AS ENUM (
  'public',
  'private',
  'restricted',
  'commercial'
);

CREATE TYPE building_access_logistics AS ENUM (
  'walk-in',
  'booking_required',
  'tour_only',
  'exterior_only'
);

CREATE TYPE building_access_cost AS ENUM (
  'free',
  'paid',
  'customers_only'
);

-- Add new columns to buildings table
ALTER TABLE buildings
  ADD COLUMN access_level building_access_level,
  ADD COLUMN access_logistics building_access_logistics,
  ADD COLUMN access_cost building_access_cost,
  ADD COLUMN access_notes TEXT;

-- Backfill data from legacy access field
UPDATE buildings
SET
  access_level = CASE
    WHEN access = 'Open Access' THEN 'public'::building_access_level
    WHEN access = 'Admission Fee' THEN 'public'::building_access_level
    WHEN access = 'Customers Only' THEN 'commercial'::building_access_level
    WHEN access = 'Appointment Only' THEN 'restricted'::building_access_level
    WHEN access = 'Exterior View Only' THEN 'private'::building_access_level
    WHEN access = 'No Access' THEN 'private'::building_access_level
    ELSE NULL
  END,
  access_logistics = CASE
    WHEN access = 'Open Access' THEN 'walk-in'::building_access_logistics
    WHEN access = 'Admission Fee' THEN 'walk-in'::building_access_logistics
    WHEN access = 'Customers Only' THEN 'walk-in'::building_access_logistics
    WHEN access = 'Appointment Only' THEN 'booking_required'::building_access_logistics
    WHEN access = 'Exterior View Only' THEN 'exterior_only'::building_access_logistics
    ELSE NULL
  END,
  access_cost = CASE
    WHEN access = 'Open Access' THEN 'free'::building_access_cost
    WHEN access = 'Admission Fee' THEN 'paid'::building_access_cost
    WHEN access = 'Customers Only' THEN 'customers_only'::building_access_cost
    WHEN access = 'Exterior View Only' THEN 'free'::building_access_cost
    ELSE NULL
  END;
