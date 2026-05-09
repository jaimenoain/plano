{
  echo "=================================================================="
  echo "SECTION A — All migrations touching search/discovery/map (filenames)"
  echo "=================================================================="
  ls supabase/migrations 2>/dev/null | grep -iE "search|discovery|nearby|map_cluster|fuzzy|trgm|tsvector|building_credit"
  echo
  echo "=================================================================="
  echo "SECTION B — Latest definition of each search RPC (full SQL body)"
  echo "=================================================================="
  for fn in search_buildings find_nearby_buildings get_discovery_filters get_discovery_feed get_map_clusters get_map_clusters_v2 get_buildings_list building_matches_credit_filters resolve_locality_for_explore; do
    echo
    echo "------------------------------------------------------------------"
    echo "FUNCTION: $fn"
    echo "------------------------------------------------------------------"
    latest=$(grep -rl "CREATE OR REPLACE FUNCTION.*\b$fn\b\|CREATE FUNCTION.*\b$fn\b" supabase/migrations 2>/dev/null | sort | tail -1)
    if [ -z "$latest" ]; then
      echo "(no migration found defining $fn)"
    else
      echo "FILE: $latest"
      echo
      awk -v fn="$fn" '
        $0 ~ "CREATE (OR REPLACE )?FUNCTION.*\\y" fn "\\y" {flag=1}
        flag {print}
        flag && /\$\$ LANGUAGE|\$function\$ LANGUAGE|LANGUAGE (sql|plpgsql|SQL|PLPGSQL)/ {flag=0; print "---END---"; exit}
      ' "$latest"
    fi
  done
  echo
  echo "=================================================================="
  echo "SECTION C — Indexes, extensions, tsvector, trigram"
  echo "=================================================================="
  grep -rn -E "CREATE (UNIQUE )?INDEX|CREATE EXTENSION|tsvector|gin_trgm_ops|USING GIST|USING GIN|to_tsvector" supabase/migrations 2>/dev/null | grep -iE "building|people|compan|search|trgm|tsvec|gist|gin"
  echo
  echo "=================================================================="
  echo "SECTION D — Triggers that maintain search columns"
  echo "=================================================================="
  grep -rn -B1 -A6 -E "CREATE (OR REPLACE )?TRIGGER|tsvector_update_trigger" supabase/migrations 2>/dev/null | grep -iE "building|people|compan|search|tsvec" -A4 -B2
  echo
  echo "=================================================================="
  echo "SECTION E — RLS SELECT policies on relevant tables"
  echo "=================================================================="
  grep -rn -B1 -A10 "CREATE POLICY" supabase/migrations 2>/dev/null | grep -iE "buildings|people|companies|building_credits" -B2 -A8
  echo
  echo "=================================================================="
  echo "SECTION F — Status / soft-delete / visibility filters in RPCs"
  echo "=================================================================="
  grep -rn -E "is_deleted|'Demolished'|'Lost'|'Unbuilt'|is_verified_architect|claim_status" supabase/migrations 2>/dev/null | grep -iE "search|discovery|map|nearby" | head -60
  echo
  echo "=================================================================="
  echo "SECTION G — Generated table types (buildings, people, companies, building_credits)"
  echo "=================================================================="
  for f in src/lib/database.types.ts src/types/plano-tables.types.ts src/lib/plano-tables.types.ts apps/web/src/lib/database.types.ts; do
    if [ -f "$f" ]; then
      echo "FILE: $f"
      awk '
        /^      (buildings|people|companies|building_credits): \{$/ {capture=1; depth=0}
        capture {
          print
          for (i=1; i<=length($0); i++) {c=substr($0,i,1); if (c=="{") depth++; if (c=="}") depth--}
          if (depth<=0 && /\}/) {capture=0; print "---END BLOCK---"}
        }
      ' "$f"
    fi
  done
  echo
  echo "=================================================================="
  echo "SECTION H — Frontend search API layer"
  echo "=================================================================="
  for f in $(find src apps -type f \( -name "buildings.ts" -o -name "people.ts" -o -name "companies.ts" \) 2>/dev/null | grep -iE "lib/api|features.*api|services" | head -20); do
    echo
    echo "------------------------------------------------------------------"
    echo "FILE: $f"
    echo "------------------------------------------------------------------"
    cat "$f"
  done
  echo
  echo "=================================================================="
  echo "SECTION I — SearchPage and core search components"
  echo "=================================================================="
  for f in $(find src apps -type f \( -name "SearchPage.tsx" -o -name "DiscoverySearchInput.tsx" -o -name "BuildingSidebar.tsx" -o -name "FilterDrawer.tsx" -o -name "OmniSearchBar.tsx" -o -name "useBuildingSearch.ts" -o -name "useURLMapState.ts" -o -name "useMapData.ts" -o -name "useGlobalEntitySearch.ts" -o -name "searchFilters.ts" \) 2>/dev/null); do
    echo
    echo "------------------------------------------------------------------"
    echo "FILE: $f"
    echo "------------------------------------------------------------------"
    cat "$f"
  done
} > search-backend-extract.txt 2>&1

echo "Done. Output: search-backend-extract.txt"
wc -l search-backend-extract.txt