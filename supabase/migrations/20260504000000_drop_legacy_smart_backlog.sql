-- Drop legacy function get_group_smart_backlog which relies on deprecated tables (films, watch_providers).
DROP FUNCTION IF EXISTS get_group_smart_backlog(UUID, UUID[], BOOLEAN, INT, TEXT[]);
