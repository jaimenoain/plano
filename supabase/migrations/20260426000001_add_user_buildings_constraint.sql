ALTER TABLE user_buildings
ADD CONSTRAINT user_buildings_user_id_building_id_key UNIQUE (user_id, building_id);
