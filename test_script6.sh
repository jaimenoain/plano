echo "Testing to find the EXACT current definition of get_map_clusters in the DB..."
# We can't query DB, but we know the latest migration for get_map_clusters is 20270803000000_add_construction_status_filter_to_search_rpcs.sql
# And for get_map_clusters_v2 it is ALSO 20270803000000_add_construction_status_filter_to_search_rpcs.sql
