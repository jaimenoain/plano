CREATE INDEX IF NOT EXISTS idx_likes_interaction_id ON likes(interaction_id);
CREATE INDEX IF NOT EXISTS idx_comments_interaction_id ON comments(interaction_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON user_buildings(user_id);
