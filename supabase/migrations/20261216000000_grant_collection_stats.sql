-- Grant execute permission on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_collection_stats(uuid) TO postgres, anon, authenticated, service_role;
