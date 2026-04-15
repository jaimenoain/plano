-- =============================================================================
-- Migration: locality_01_normalize_buildings
-- Purpose:   Normalize buildings.city and buildings.country for consistency,
--            and add a buildings.country_code column (ISO 3166-1 alpha-2).
--
-- This migration is a prerequisite for creating the localities table.
-- It must be applied BEFORE locality_02 and locality_03.
--
-- Safe to re-run: all operations use IF NOT EXISTS / idempotent UPDATE logic.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0: Audit query (informational — does not mutate data)
-- Run this manually before applying to understand the current state:
--
--   SELECT city, country, count(*)
--   FROM buildings
--   WHERE is_deleted = false
--   GROUP BY city, country
--   ORDER BY count(*) DESC;
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- STEP 1: Add country_code column to buildings
-- -----------------------------------------------------------------------------

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS country_code text;

COMMENT ON COLUMN public.buildings.country_code IS
  'ISO 3166-1 alpha-2 country code, e.g. ''GB'', ''DE'', ''US''. '
  'Derived from buildings.country during migration and kept in sync by trigger.';


-- -----------------------------------------------------------------------------
-- STEP 2: Create a reusable helper function for country name → ISO alpha-2
--
-- Covers the countries most likely to appear in an architecture catalogue.
-- Returns NULL for unknown values so they are visible as data quality gaps.
-- IMMUTABLE + SECURITY DEFINER so it can be used safely in triggers and RLS.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.country_name_to_code(p_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE lower(trim(p_country))
    -- A
    WHEN 'afghanistan'                    THEN 'AF'
    WHEN 'albania'                        THEN 'AL'
    WHEN 'algeria'                        THEN 'DZ'
    WHEN 'andorra'                        THEN 'AD'
    WHEN 'angola'                         THEN 'AO'
    WHEN 'argentina'                      THEN 'AR'
    WHEN 'armenia'                        THEN 'AM'
    WHEN 'australia'                      THEN 'AU'
    WHEN 'austria'                        THEN 'AT'
    WHEN 'azerbaijan'                     THEN 'AZ'
    -- B
    WHEN 'bahrain'                        THEN 'BH'
    WHEN 'bangladesh'                     THEN 'BD'
    WHEN 'belarus'                        THEN 'BY'
    WHEN 'belgium'                        THEN 'BE'
    WHEN 'bolivia'                        THEN 'BO'
    WHEN 'bosnia and herzegovina'         THEN 'BA'
    WHEN 'bosnia & herzegovina'           THEN 'BA'
    WHEN 'brazil'                         THEN 'BR'
    WHEN 'brasil'                         THEN 'BR'
    WHEN 'bulgaria'                       THEN 'BG'
    -- C
    WHEN 'cambodia'                       THEN 'KH'
    WHEN 'cameroon'                       THEN 'CM'
    WHEN 'canada'                         THEN 'CA'
    WHEN 'chile'                          THEN 'CL'
    WHEN 'china'                          THEN 'CN'
    WHEN 'people''s republic of china'    THEN 'CN'
    WHEN 'colombia'                       THEN 'CO'
    WHEN 'costa rica'                     THEN 'CR'
    WHEN 'croatia'                        THEN 'HR'
    WHEN 'cuba'                           THEN 'CU'
    WHEN 'cyprus'                         THEN 'CY'
    WHEN 'czech republic'                 THEN 'CZ'
    WHEN 'czechia'                        THEN 'CZ'
    -- D
    WHEN 'denmark'                        THEN 'DK'
    -- E
    WHEN 'ecuador'                        THEN 'EC'
    WHEN 'egypt'                          THEN 'EG'
    WHEN 'el salvador'                    THEN 'SV'
    WHEN 'estonia'                        THEN 'EE'
    WHEN 'ethiopia'                       THEN 'ET'
    -- F
    WHEN 'finland'                        THEN 'FI'
    WHEN 'france'                         THEN 'FR'
    -- G
    WHEN 'georgia'                        THEN 'GE'
    WHEN 'germany'                        THEN 'DE'
    WHEN 'deutschland'                    THEN 'DE'
    WHEN 'ghana'                          THEN 'GH'
    WHEN 'greece'                         THEN 'GR'
    WHEN 'guatemala'                      THEN 'GT'
    -- H
    WHEN 'honduras'                       THEN 'HN'
    WHEN 'hong kong'                      THEN 'HK'
    WHEN 'hungary'                        THEN 'HU'
    -- I
    WHEN 'iceland'                        THEN 'IS'
    WHEN 'india'                          THEN 'IN'
    WHEN 'indonesia'                      THEN 'ID'
    WHEN 'iran'                           THEN 'IR'
    WHEN 'iraq'                           THEN 'IQ'
    WHEN 'ireland'                        THEN 'IE'
    WHEN 'republic of ireland'            THEN 'IE'
    WHEN 'israel'                         THEN 'IL'
    WHEN 'italy'                          THEN 'IT'
    WHEN 'italia'                         THEN 'IT'
    -- J
    WHEN 'jamaica'                        THEN 'JM'
    WHEN 'japan'                          THEN 'JP'
    WHEN 'jordan'                         THEN 'JO'
    -- K
    WHEN 'kazakhstan'                     THEN 'KZ'
    WHEN 'kenya'                          THEN 'KE'
    WHEN 'kuwait'                         THEN 'KW'
    -- L
    WHEN 'latvia'                         THEN 'LV'
    WHEN 'lebanon'                        THEN 'LB'
    WHEN 'libya'                          THEN 'LY'
    WHEN 'liechtenstein'                  THEN 'LI'
    WHEN 'lithuania'                      THEN 'LT'
    WHEN 'luxembourg'                     THEN 'LU'
    -- M
    WHEN 'malaysia'                       THEN 'MY'
    WHEN 'malta'                          THEN 'MT'
    WHEN 'mexico'                         THEN 'MX'
    WHEN 'méxico'                         THEN 'MX'
    WHEN 'moldova'                        THEN 'MD'
    WHEN 'monaco'                         THEN 'MC'
    WHEN 'mongolia'                       THEN 'MN'
    WHEN 'montenegro'                     THEN 'ME'
    WHEN 'morocco'                        THEN 'MA'
    -- N
    WHEN 'nepal'                          THEN 'NP'
    WHEN 'netherlands'                    THEN 'NL'
    WHEN 'the netherlands'                THEN 'NL'
    WHEN 'holland'                        THEN 'NL'
    WHEN 'new zealand'                    THEN 'NZ'
    WHEN 'nicaragua'                      THEN 'NI'
    WHEN 'nigeria'                        THEN 'NG'
    WHEN 'north korea'                    THEN 'KP'
    WHEN 'north macedonia'                THEN 'MK'
    WHEN 'norway'                         THEN 'NO'
    -- O
    WHEN 'oman'                           THEN 'OM'
    -- P
    WHEN 'pakistan'                       THEN 'PK'
    WHEN 'palestine'                      THEN 'PS'
    WHEN 'panama'                         THEN 'PA'
    WHEN 'paraguay'                       THEN 'PY'
    WHEN 'peru'                           THEN 'PE'
    WHEN 'philippines'                    THEN 'PH'
    WHEN 'poland'                         THEN 'PL'
    WHEN 'polska'                         THEN 'PL'
    WHEN 'portugal'                       THEN 'PT'
    -- Q
    WHEN 'qatar'                          THEN 'QA'
    -- R
    WHEN 'romania'                        THEN 'RO'
    WHEN 'russia'                         THEN 'RU'
    WHEN 'russian federation'             THEN 'RU'
    -- S
    WHEN 'saudi arabia'                   THEN 'SA'
    WHEN 'senegal'                        THEN 'SN'
    WHEN 'serbia'                         THEN 'RS'
    WHEN 'singapore'                      THEN 'SG'
    WHEN 'slovakia'                       THEN 'SK'
    WHEN 'slovenia'                       THEN 'SI'
    WHEN 'south africa'                   THEN 'ZA'
    WHEN 'south korea'                    THEN 'KR'
    WHEN 'republic of korea'              THEN 'KR'
    WHEN 'spain'                          THEN 'ES'
    WHEN 'españa'                         THEN 'ES'
    WHEN 'sri lanka'                      THEN 'LK'
    WHEN 'sweden'                         THEN 'SE'
    WHEN 'switzerland'                    THEN 'CH'
    WHEN 'schweiz'                        THEN 'CH'
    WHEN 'suisse'                         THEN 'CH'
    WHEN 'syria'                          THEN 'SY'
    -- T
    WHEN 'taiwan'                         THEN 'TW'
    WHEN 'tanzania'                       THEN 'TZ'
    WHEN 'thailand'                       THEN 'TH'
    WHEN 'tunisia'                        THEN 'TN'
    WHEN 'turkey'                         THEN 'TR'
    WHEN 'türkiye'                        THEN 'TR'
    -- U
    WHEN 'ukraine'                        THEN 'UA'
    WHEN 'united arab emirates'           THEN 'AE'
    WHEN 'uae'                            THEN 'AE'
    WHEN 'united kingdom'                 THEN 'GB'
    WHEN 'uk'                             THEN 'GB'
    WHEN 'great britain'                  THEN 'GB'
    WHEN 'england'                        THEN 'GB'
    WHEN 'scotland'                       THEN 'GB'
    WHEN 'wales'                          THEN 'GB'
    WHEN 'northern ireland'               THEN 'GB'
    WHEN 'united states'                  THEN 'US'
    WHEN 'united states of america'       THEN 'US'
    WHEN 'usa'                            THEN 'US'
    WHEN 'u.s.a.'                         THEN 'US'
    WHEN 'u.s.'                           THEN 'US'
    WHEN 'uruguay'                        THEN 'UY'
    WHEN 'uzbekistan'                     THEN 'UZ'
    -- V
    WHEN 'venezuela'                      THEN 'VE'
    WHEN 'vietnam'                        THEN 'VN'
    WHEN 'viet nam'                       THEN 'VN'
    -- Y
    WHEN 'yemen'                          THEN 'YE'
    -- Z
    WHEN 'zimbabwe'                       THEN 'ZW'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.country_name_to_code(text) IS
  'Maps a country name (in any common form) to its ISO 3166-1 alpha-2 code. '
  'Returns NULL for unrecognised values — these should be reviewed and fixed manually.';


-- -----------------------------------------------------------------------------
-- STEP 3: Normalize city and country text in buildings
--
-- Applies: trim whitespace, initcap for consistent title-casing.
-- Only touches rows with non-null values.
-- -----------------------------------------------------------------------------

UPDATE public.buildings
SET
  city    = initcap(trim(city)),
  country = initcap(trim(country))
WHERE
  (city    IS NOT NULL AND city    IS DISTINCT FROM initcap(trim(city)))
  OR
  (country IS NOT NULL AND country IS DISTINCT FROM initcap(trim(country)));


-- -----------------------------------------------------------------------------
-- STEP 4: Populate country_code from country
-- -----------------------------------------------------------------------------

UPDATE public.buildings
SET country_code = public.country_name_to_code(country)
WHERE country IS NOT NULL
  AND country_code IS NULL;


-- -----------------------------------------------------------------------------
-- STEP 5: Post-migration audit
--
-- Run this after applying to identify any country values that did not map to
-- a code. These rows need manual review:
--
--   SELECT country, count(*) as buildings
--   FROM buildings
--   WHERE country IS NOT NULL AND country_code IS NULL AND is_deleted = false
--   GROUP BY country
--   ORDER BY buildings DESC;
--
-- For each unmapped country, either:
--   a) Fix the country value in the buildings row (if it's a data error), or
--   b) Add a new WHEN clause to country_name_to_code() and re-run Step 4.
-- -----------------------------------------------------------------------------
