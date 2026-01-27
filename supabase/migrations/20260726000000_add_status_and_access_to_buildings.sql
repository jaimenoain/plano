-- Create ENUM types for building status and access
CREATE TYPE building_status AS ENUM (
  'Built',
  'Under Construction',
  'Unbuilt',
  'Demolished',
  'Temporary'
);

CREATE TYPE building_access AS ENUM (
  'Open Access',
  'Admission Fee',
  'Customers Only',
  'Appointment Only',
  'Exterior View Only',
  'No Access'
);

-- Add columns to buildings table
ALTER TABLE buildings ADD COLUMN status building_status;
ALTER TABLE buildings ADD COLUMN access building_access;
