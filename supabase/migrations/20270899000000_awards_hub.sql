-- Phase 5 — Awards Hub
-- Migration: 20270899000000_awards_hub.sql

-- Person award leaderboard RPC (companion to get_award_leaderboard for buildings)
CREATE OR REPLACE FUNCTION public.get_person_award_leaderboard(
  p_award_id UUID DEFAULT NULL,
  p_limit    INT  DEFAULT 50
)
RETURNS TABLE(
  person_id   UUID,
  person_name TEXT,
  person_slug TEXT,
  avatar_url  TEXT,
  award_count INT,
  win_count   INT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.name,
    p.slug,
    p.avatar_url,
    COUNT(*)::INT                                              AS award_count,
    COUNT(*) FILTER (WHERE ar.outcome = 'winner')::INT         AS win_count
  FROM public.award_recipients ar
  JOIN public.award_editions   ae ON ae.id = ar.edition_id
  JOIN public.people            p ON  p.id = ar.recipient_person_id
  WHERE ar.recipient_type = 'person'
    AND (p_award_id IS NULL OR ae.award_id = p_award_id)
  GROUP BY p.id, p.name, p.slug, p.avatar_url
  ORDER BY award_count DESC, win_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_person_award_leaderboard(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_person_award_leaderboard(UUID, INT) TO anon;
