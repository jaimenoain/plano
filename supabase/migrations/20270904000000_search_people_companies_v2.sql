-- Phase 2: Hybrid scoring foundation for people and companies search
--
-- What this migration does:
--   1. Adds search_vector tsvector column to people (maintained via trigger)
--   2. Adds search_vector tsvector column to companies (maintained via trigger)
--   3. Adds GIN indexes on both search_vectors
--   4. Adds GIN trigram indexes on people.name and companies.name
--      (neither exists today — a major cause of the sequential-scan slowness
--       in the existing ilike '%q%' searchPeople / searchCompanies queries)
--   5. Creates search_people_v2 RPC — viewport-independent, typo-tolerant, ranked
--   6. Creates search_companies_v2 RPC — same scoring shape
--
-- Design decisions:
--
-- 'simple' dictionary (not 'english'): person and company names are multilingual
-- proper nouns. English stemming degrades "Renzo Piano" → "renzo piano" → "piano"
-- (which is correct) but also "zaha" → "zaha" (fine), yet "hadid" → "hadid" (fine).
-- The real risk is with non-Latin names where stemming is undefined. 'simple'
-- lowercases without stemming — safe for all scripts that pg_trgm can handle.
--
-- credit_count popularity proxy: the number of active building_credits rows linked
-- to a person or company is the natural popularity signal. Log-normalised over a
-- range of ~0–500 credits (most entities cluster near 0; a handful have hundreds).
-- Formula: log(credits+1) / log(501) ≈ 0–1.
--
-- Trigram threshold 0.2: same as search_buildings_v2. Catches transpositions and
-- missing vowels ("renz" → "Renzo", "pian" → "Piano") without flooding results
-- with unrelated names that share a single trigram.

-- Ensure pg_trgm extension (idempotent — already enabled by Phase 1 migration)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── PEOPLE ───────────────────────────────────────────────────────────────────

-- 1. Add search_vector column
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Trigger function
CREATE OR REPLACE FUNCTION public.update_person_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.nationality, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.bio, '')), 'D');
  RETURN NEW;
END;
$$;

-- 3. Trigger: fires on INSERT and on UPDATE of indexed columns only
DROP TRIGGER IF EXISTS people_search_vector_update ON public.people;
CREATE TRIGGER people_search_vector_update
  BEFORE INSERT OR UPDATE OF name, nationality, bio
  ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.update_person_search_vector();

-- 4. Backfill existing rows
UPDATE public.people
SET search_vector =
  setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(nationality, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(bio, '')), 'D')
WHERE search_vector IS NULL;

-- 5. GIN index for full-text @@ queries
CREATE INDEX IF NOT EXISTS people_search_vector_gin_idx
  ON public.people USING GIN (search_vector);

-- 6. Trigram index on name (does not exist today)
CREATE INDEX IF NOT EXISTS people_name_trgm_idx
  ON public.people USING GIN (name gin_trgm_ops);

-- ─── COMPANIES ────────────────────────────────────────────────────────────────

-- 7. Add search_vector column
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 8. Trigger function
CREATE OR REPLACE FUNCTION public.update_company_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.country, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.bio, '')), 'D');
  RETURN NEW;
END;
$$;

-- 9. Trigger
DROP TRIGGER IF EXISTS companies_search_vector_update ON public.companies;
CREATE TRIGGER companies_search_vector_update
  BEFORE INSERT OR UPDATE OF name, country, bio
  ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_company_search_vector();

-- 10. Backfill existing rows
UPDATE public.companies
SET search_vector =
  setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(country, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(bio, '')), 'D')
WHERE search_vector IS NULL;

-- 11. GIN index
CREATE INDEX IF NOT EXISTS companies_search_vector_gin_idx
  ON public.companies USING GIN (search_vector);

-- 12. Trigram index on name (does not exist today)
CREATE INDEX IF NOT EXISTS companies_name_trgm_idx
  ON public.companies USING GIN (name gin_trgm_ops);

-- ─── search_people_v2 ─────────────────────────────────────────────────────────
--
-- Returns up to p_limit people ranked by:
--   0.6 × ts_rank_cd (full-text relevance, name weighted A)
-- + 0.3 × similarity(name, query) (trigram typo tolerance)
-- + 0.1 × log-normalised credit count (popularity tiebreaker)
--
-- A row qualifies if the tsquery matches OR trigram similarity on name ≥ 0.2.
-- associatedCompanies is omitted — callers that need it (CreditEntityPicker)
-- use searchPeople directly. This RPC is tuned for fast autocomplete.
CREATE OR REPLACE FUNCTION public.search_people_v2(
  p_query  text,
  p_limit  int DEFAULT 10
)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  claim_status text,
  nationality  text,
  avatar_url   text,
  credit_count bigint,
  rank_score   double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', p_query) AS tsq
  ),
  credit_counts AS (
    SELECT person_id, COUNT(*) AS cnt
    FROM building_credits
    WHERE status IN ('active', 'verified') AND person_id IS NOT NULL
    GROUP BY person_id
  ),
  ranked AS (
    SELECT
      pe.id,
      pe.name,
      pe.slug,
      pe.claim_status::text,
      pe.nationality,
      pe.avatar_url,
      COALESCE(cc.cnt, 0)::bigint AS credit_count,
      (
        0.6 * ts_rank_cd(pe.search_vector, q.tsq)
        + 0.3 * similarity(pe.name, p_query)
        + 0.1 * (log(GREATEST(1, COALESCE(cc.cnt, 0) + 1)) / log(501))
      ) AS rank_score
    FROM people pe
    CROSS JOIN q
    LEFT JOIN credit_counts cc ON cc.person_id = pe.id
    WHERE
      (q.tsq IS NOT NULL AND pe.search_vector @@ q.tsq)
      OR similarity(pe.name, p_query) >= 0.2
  )
  SELECT id, name, slug, claim_status, nationality, avatar_url, credit_count, rank_score
  FROM ranked
  ORDER BY rank_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_people_v2(text, int) TO anon, authenticated;

-- ─── search_companies_v2 ──────────────────────────────────────────────────────
--
-- Same scoring shape as search_people_v2.
CREATE OR REPLACE FUNCTION public.search_companies_v2(
  p_query  text,
  p_limit  int DEFAULT 10
)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  claim_status text,
  country      text,
  logo_url     text,
  credit_count bigint,
  rank_score   double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', p_query) AS tsq
  ),
  credit_counts AS (
    SELECT company_id, COUNT(*) AS cnt
    FROM building_credits
    WHERE status IN ('active', 'verified') AND company_id IS NOT NULL
    GROUP BY company_id
  ),
  ranked AS (
    SELECT
      co.id,
      co.name,
      co.slug,
      co.claim_status::text,
      co.country,
      co.logo_url,
      COALESCE(cc.cnt, 0)::bigint AS credit_count,
      (
        0.6 * ts_rank_cd(co.search_vector, q.tsq)
        + 0.3 * similarity(co.name, p_query)
        + 0.1 * (log(GREATEST(1, COALESCE(cc.cnt, 0) + 1)) / log(501))
      ) AS rank_score
    FROM companies co
    CROSS JOIN q
    LEFT JOIN credit_counts cc ON cc.company_id = co.id
    WHERE
      (q.tsq IS NOT NULL AND co.search_vector @@ q.tsq)
      OR similarity(co.name, p_query) >= 0.2
  )
  SELECT id, name, slug, claim_status, country, logo_url, credit_count, rank_score
  FROM ranked
  ORDER BY rank_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_companies_v2(text, int) TO anon, authenticated;
