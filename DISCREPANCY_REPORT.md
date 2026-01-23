# Discrepancy Report

## Invalid Table References

| File | Line | Error | Fix |
|---|---|---|---|
| `src/pages/Post.tsx` | 74 | Invalid table reference: 'films' | Change to 'buildings' |
| `src/pages/Post.tsx` | 84, 110, 125, 149, 184 | Invalid table reference: 'log' | Change to 'user_buildings' |
| `src/components/common/RecommendDialog.tsx` | 46, 68, 77, 85 | Invalid table reference: 'log' | Change to 'user_buildings' |
| `src/api/diagnostics.ts` | 23, 41 | Invalid table reference: 'admin_diagnostic_logs' | Change to 'admin_audit_logs' |

## Invalid Column References

| File | Line | Error | Fix |
|---|---|---|---|
| `src/pages/Post.tsx` | multiple | Invalid column 'film_id' on table 'log' (now 'user_buildings') | Change to 'building_id' |
| `src/pages/Post.tsx` | multiple | Invalid column 'poster_path' on table 'films' (now 'buildings') | Change to 'main_image_url' |
| `src/pages/Post.tsx` | multiple | Invalid column 'release_date' on table 'films' (now 'buildings') | Change to 'year_completed' |
| `src/components/common/RecommendDialog.tsx` | multiple | Invalid column 'film_id' on table 'log' (now 'user_buildings') | Change to 'building_id' |
| `src/components/admin/SessionDiagnosticZone.tsx` | 42 | Invalid column 'count' on table 'profiles' | Change to 'id' (connection check) |
| `src/api/admin.ts` | 9 | Invalid column 'is_deleted' on table 'buildings' | Remove column check |
| `src/pages/admin/MergeBuildings.tsx` | 84 | Invalid column 'is_deleted' on table 'buildings' | Remove column check |

## Notes
*   `admin_diagnostic_logs` functionality will be migrated to `admin_audit_logs` using `action_type`='DIAGNOSTIC_ERROR'.
*   Legacy status values 'watchlist'/'watched' will be updated to 'pending'/'visited' to match `user_buildings` schema.
*   Storage bucket references (avatars, poll_images, group_covers) were ignored as they are not database tables.
