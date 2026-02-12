-- Migration ID: 20270521000000_fix_tier_ranking_logic.sql

-- 1. Redefine update_building_tiers function to handle score 0
CREATE OR REPLACE FUNCTION update_building_tiers()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    WITH ranked_buildings AS (
        SELECT
            id,
            popularity_score,
            percent_rank() OVER (ORDER BY popularity_score DESC) as pct_rank
        FROM
            public.buildings
    ),
    final_tiers AS (
        SELECT
            id,
            CASE
                WHEN popularity_score = 0 THEN 'Standard'::public.building_tier_rank
                WHEN pct_rank <= 0.01 THEN 'Top 1%'::public.building_tier_rank
                WHEN pct_rank <= 0.05 THEN 'Top 5%'::public.building_tier_rank
                WHEN pct_rank <= 0.10 THEN 'Top 10%'::public.building_tier_rank
                WHEN pct_rank <= 0.20 THEN 'Top 20%'::public.building_tier_rank
                ELSE 'Standard'::public.building_tier_rank
            END as new_tier
        FROM ranked_buildings
    )
    UPDATE public.buildings b
    SET tier_rank = ft.new_tier
    FROM final_tiers ft
    WHERE b.id = ft.id
    AND b.tier_rank IS DISTINCT FROM ft.new_tier;
END;
$$;

-- 2. Recalculate tiers for all buildings to fix existing data
SELECT update_building_tiers();
