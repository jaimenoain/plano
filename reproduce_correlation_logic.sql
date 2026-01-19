
-- Reproduction Script: verify_correlation_logic.sql
-- This script simulates the logic used in calculate_scope_stats to demonstrate
-- how 'Flatline Raters' (zero variance) result in NULL correlation and how that affects sorting.

WITH test_data(user_id, film_id, rating) AS (
    VALUES
    -- User 1: Flatline rater (always 7)
    ('u1', 'f1', 7), ('u1', 'f2', 7), ('u1', 'f3', 7), ('u1', 'f4', 7), ('u1', 'f5', 7),
    -- User 2: Normal rater
    ('u2', 'f1', 8), ('u2', 'f2', 6), ('u2', 'f3', 9), ('u2', 'f4', 5), ('u2', 'f5', 7),
    -- User 3: Opposite to User 2
    ('u3', 'f1', 2), ('u3', 'f2', 4), ('u3', 'f3', 1), ('u3', 'f4', 5), ('u3', 'f5', 3)
),
pair_stats AS (
    SELECT
        t1.user_id as u1,
        t2.user_id as u2,
        corr(t1.rating, t2.rating) as correlation,
        count(*) as shared_count
    FROM test_data t1
    JOIN test_data t2 ON t1.film_id = t2.film_id AND t1.user_id < t2.user_id
    GROUP BY t1.user_id, t2.user_id
    HAVING count(*) >= 3
)
SELECT
    u1,
    u2,
    correlation,
    shared_count,
    'Logic produces NULL for Flatline Rater (' || u1 || ')' as issue_description
FROM pair_stats
ORDER BY correlation DESC;
