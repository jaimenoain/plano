-- Rename credit_role_enum values from person-based (e.g. 'design_architect')
-- to discipline-based (e.g. 'design_architecture') to better represent
-- company-linked credits.
--
-- A prior attempt at this rename (file 20270896000000_rename_credit_roles_to_disciplines.sql)
-- shared its timestamp with another migration and was silently skipped by the
-- Supabase migration tracker, leaving production with the old enum values
-- while the application code expected the renamed ones. This migration is
-- idempotent: each rename only runs if the old value still exists, so it
-- is safe to apply in environments where the rename partially succeeded.

DO $$
DECLARE
  pair record;
  enum_oid oid := 'public.credit_role_enum'::regtype;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('design_architect',        'design_architecture'),
      ('architect_of_record',     'architecture_of_record'),
      ('executive_architect',     'executive_architecture'),
      ('interior_architect',      'interior_architecture'),
      ('landscape_architect',     'landscape_architecture'),
      ('urban_designer',          'urban_design'),
      ('conservation_architect',  'conservation_architecture'),
      ('structural_engineer',     'structural_engineering'),
      ('mep_engineer',            'mep_engineering'),
      ('civil_engineer',          'civil_engineering'),
      ('geotechnical_engineer',   'geotechnical_engineering'),
      ('facade_engineer',         'facade_engineering'),
      ('wind_consultant',         'wind_consultancy'),
      ('acoustic_consultant',     'acoustic_consultancy'),
      ('fire_engineer',           'fire_engineering'),
      ('lighting_designer',       'lighting_design'),
      ('developer',               'development'),
      ('main_contractor',         'main_contracting'),
      ('project_manager',         'project_management'),
      ('cost_consultant',         'cost_consultancy'),
      ('planning_consultant',     'planning_consultancy'),
      ('graphic_wayfinding_designer', 'graphic_wayfinding_design'),
      ('art_consultant',          'art_consultancy'),
      ('sustainability_consultant', 'sustainability_consultancy'),
      ('heritage_consultant',     'heritage_consultancy')
    ) AS t(old_value, new_value)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_oid AND enumlabel = pair.old_value
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_oid AND enumlabel = pair.new_value
    ) THEN
      EXECUTE format(
        'ALTER TYPE public.credit_role_enum RENAME VALUE %L TO %L',
        pair.old_value, pair.new_value
      );
    END IF;
  END LOOP;
END $$;
