echo "Functions to update in get_map_clusters"
grep -n "CREATE OR REPLACE FUNCTION get_map_clusters(" supabase/migrations/20270803000000_add_construction_status_filter_to_search_rpcs.sql

echo ""
echo "Functions to update in get_map_clusters_v2"
grep -n "CREATE OR REPLACE FUNCTION get_map_clusters_v2(" supabase/migrations/20270803000000_add_construction_status_filter_to_search_rpcs.sql
