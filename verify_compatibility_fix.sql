
-- Verification Script: verify_compatibility_fix.sql
-- This script simulates the FIXED logic using CTEs to prove that the flaw is resolved.
-- Changes from reproduction:
-- 1. COALESCE(corr(...), 0)
-- 2. HAVING count(*) >= 5 (simulated, though our test data has 5 shared films)

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
        COALESCE(corr(t1.rating, t2.rating), 0) as correlation,
        count(*) as shared_count
    FROM test_data t1
    JOIN test_data t2 ON t1.film_id = t2.film_id AND t1.user_id < t2.user_id
    GROUP BY t1.user_id, t2.user_id
    HAVING count(*) >= 5
)
SELECT
    u1,
    u2,
    correlation,
    shared_count,
    CASE
        WHEN correlation = 0 AND (u1 = 'u1' OR u2 = 'u1') THEN 'FIX VERIFIED: Flatline rater has 0 correlation'
        ELSE 'Normal correlation'
    END as verification_status
FROM pair_stats
ORDER BY correlation DESC;
