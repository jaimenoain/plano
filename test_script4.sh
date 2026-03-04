echo "Finding functions enclosing line 859 in 20270802000002_add_access_filters_to_search_rpcs.sql"
head -n 859 supabase/migrations/20270802000002_add_access_filters_to_search_rpcs.sql | grep "CREATE OR REPLACE FUNCTION" | tail -n 1
