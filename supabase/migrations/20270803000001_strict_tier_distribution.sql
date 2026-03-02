-- Migration ID: 20270803000001_strict_tier_distribution.sql

-- Redefine update_building_tiers function to use strict quotas with hierarchical tie-breaking
CREATE OR REPLACE FUNCTION update_building_tiers()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    total_buildings INTEGER;
    tier_1_cutoff INTEGER;
    tier_2_cutoff INTEGER;
    tier_3_cutoff INTEGER;
    tier_4_cutoff INTEGER;
BEGIN
    -- Calculate total count of active buildings
    SELECT COUNT(*) INTO total_buildings
    FROM public.buildings
    WHERE is_deleted IS FALSE OR is_deleted IS NULL;

    -- If there are no active buildings, exit early
    IF total_buildings = 0 THEN
        RETURN;
    END IF;

    -- Calculate strict capacity cut-offs based on the total active buildings
    tier_1_cutoff := CEIL(total_buildings * 0.01);
    tier_2_cutoff := CEIL(total_buildings * 0.05);
    tier_3_cutoff := CEIL(total_buildings * 0.10);
    tier_4_cutoff := CEIL(total_buildings * 0.25); -- Expanding to Top 25% cumulative

    WITH photo_counts AS (
        -- Aggregate photo counts per building to avoid massive joins later
        SELECT
            ub.building_id,
            COUNT(ri.id) as count
        FROM
            public.user_buildings ub
        JOIN
            public.review_images ri ON ub.id = ri.review_id
        GROUP BY
            ub.building_id
    ),
    ranked_buildings AS (
        SELECT
            b.id,
            b.popularity_score,
            ROW_NUMBER() OVER (
                ORDER BY
                    b.popularity_score DESC,
                    COALESCE(pc.count, 0) DESC,
                    b.created_at DESC
            ) as row_num
        FROM
            public.buildings b
        LEFT JOIN
            photo_counts pc ON b.id = pc.building_id
        WHERE
            b.is_deleted IS FALSE OR b.is_deleted IS NULL
    ),
    final_tiers AS (
        SELECT
            rb.id,
            CASE
                WHEN rb.row_num <= tier_1_cutoff THEN 'Top 1%'::public.building_tier_rank
                WHEN rb.row_num <= tier_2_cutoff THEN 'Top 5%'::public.building_tier_rank
                WHEN rb.row_num <= tier_3_cutoff THEN 'Top 10%'::public.building_tier_rank
                WHEN rb.row_num <= tier_4_cutoff THEN 'Top 25%'::public.building_tier_rank
                ELSE 'Standard'::public.building_tier_rank
            END as new_tier
        FROM ranked_buildings rb
    )
    UPDATE public.buildings b
    SET tier_rank = ft.new_tier
    FROM final_tiers ft
    WHERE b.id = ft.id
    AND b.tier_rank IS DISTINCT FROM ft.new_tier;

    -- Optionally, also handle deleted buildings by setting them to 'Standard'
    -- if they aren't already, although typically queries filter them out anyway.
    UPDATE public.buildings
    SET tier_rank = 'Standard'::public.building_tier_rank
    WHERE (is_deleted IS TRUE)
    AND tier_rank IS DISTINCT FROM 'Standard'::public.building_tier_rank;

END;
$$;

-- Recalculate tiers for all buildings to apply strict distribution
SELECT update_building_tiers();
