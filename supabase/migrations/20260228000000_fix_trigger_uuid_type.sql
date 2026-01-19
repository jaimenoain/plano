-- Fix type mismatch in update_film_community_stats trigger function
-- Previous definition used TEXT for film_id (UUID), causing "operator does not exist: uuid = text" errors.

CREATE OR REPLACE FUNCTION update_film_community_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_film_id UUID; -- Changed from TEXT to UUID
    stats RECORD;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_film_id := OLD.film_id;
    ELSE
        target_film_id := NEW.film_id;
    END IF;

    -- Calculate new stats
    SELECT
        COUNT(*) as count,
        COALESCE(AVG(rating), 0) as average
    INTO stats
    FROM log
    WHERE film_id = target_film_id
    AND rating IS NOT NULL;

    -- Update films table
    UPDATE films
    SET
        community_rating_count = stats.count,
        community_vote_average = stats.average
    WHERE id = target_film_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
