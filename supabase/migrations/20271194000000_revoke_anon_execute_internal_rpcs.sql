-- ============================================================================
-- Revoke anon/authenticated EXECUTE from internal & privileged public functions
-- ============================================================================
-- types-neutral: privilege changes only; no function signature, RETURNS, or
-- table shape is altered, so `npm run gen-types` is a no-op.
--
-- WHY THIS EXISTS
-- ---------------
-- Supabase ships this project with:
--
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS
--     TO anon, authenticated;
--
-- so every function created in `public` receives a DIRECT grant to `anon` and
-- `authenticated` at creation time. The `revoke ... from public` line used
-- throughout this repo's migrations only drops the PUBLIC pseudo-role — it does
-- NOT touch those direct grants. Net effect: for years, every new RPC has been
-- callable by an anonymous browser holding only the publishable anon key.
--
-- This was found while shipping the Embassy weekly digest (#1671): an anonymous
-- `POST /rest/v1/rpc/run_weekly_digest` returned 200 and actually ran the
-- function. That one is already fixed; this migration is the systematic sweep
-- of everything else, plus a template/doc fix so it stops recurring.
--
-- WHAT IS REVOKED
-- ---------------
-- Only SECURITY DEFINER functions that are (a) never called by the client with
-- an anon/authenticated key, and (b) not reachable from anything that runs with
-- the caller's own privileges. They fall into four groups:
--
--   * internal `_`-prefixed helpers and predicate helpers, only ever called
--     from inside other SECURITY DEFINER functions (which run as the owner, so
--     the caller's own EXECUTE bit is irrelevant);
--   * privileged mutators that should never be reachable from a browser at all
--     (`rls_auto_enable`, `refresh_locality_hero_images`, `send_session_reminders`,
--     `migrate_tags_to_collections`, `fix_orphaned_user_buildings`);
--   * superseded read RPCs that cross user boundaries (`get_main_feed`,
--     `get_explorer_feed`, `get_admin_dashboard_stats`, `get_photo_heatmap_data`);
--   * orphans inherited from the forked film-club codebase, whose tables no
--     longer exist (`is_group_member`, `update_group_stats`, `search_films_debug`, …).
--
-- WHAT IS DELIBERATELY *NOT* REVOKED
-- ----------------------------------
--   * Anything the app calls with the anon key. Every name below was checked
--     against `src/`, `supabase/functions/` and `e2e/` first.
--
--   * The nine helpers referenced by RLS policy expressions:
--     `_ambassador_can_access_chapter`, `is_admin`, `is_chapter_leader`,
--     `is_collection_admin`, `is_collection_contributor`,
--     `is_verified_architect_for_building`, `plano_auth_is_award_admin`,
--     `plano_auth_is_award_admin_for_recipient`, `plano_auth_is_company_steward`.
--     A policy's USING/WITH CHECK expression is evaluated as the *querying*
--     role, and Postgres checks that role's EXECUTE privilege on any function it
--     calls. Revoking these would turn every read of the protected table into
--     `ERROR: permission denied for function ...` — verified empirically on a
--     throwaway table before writing this migration. Several of those policies
--     are `TO PUBLIC`, so `anon` must keep EXECUTE too, not just `authenticated`.
--
--   * Helpers reachable from a SECURITY INVOKER function that anon does call:
--     `get_locality_collections` and `is_ambassador` (via `get_country_guide`),
--     `main_image_url` (via `find_nearby_buildings`, and as a PostgREST computed
--     column on `buildings`).
--
--   * SECURITY INVOKER functions generally. They execute with the caller's own
--     rights and RLS still applies, so an anon grant confers nothing anon did
--     not already have. Left alone even where unused (`search_profiles`,
--     `get_user_tags`, `calculate_scope_stats`, `get_group_film_stats`,
--     `update_building_tiers`, `get_buildings_missing_address`).
--
--   * Trigger functions. Postgres does not check EXECUTE when firing a trigger,
--     and PostgREST cannot invoke a `returns trigger` function directly, so the
--     grant is inert rather than dangerous.
--
-- `postgres` and `service_role` keep EXECUTE throughout (they hold their own
-- grants). The four pg_cron jobs run as `postgres` and are unaffected.
-- ============================================================================

revoke all on function public._ambassador_profile_matches_chapter(p_country text, p_location text, p_chapter ambassador_chapters) from public, anon, authenticated;
revoke all on function public._building_in_ambassador_chapter_scope(p_building_id uuid, p_chapter_id uuid) from public, anon, authenticated;
revoke all on function public.building_matches_contact_filters(p_building_id uuid, p_rated_by text[], p_filter_contacts boolean, p_contact_min_rating integer) from public, anon, authenticated;
revoke all on function public.building_matches_credit_filters(p_building_id uuid, p_company_id uuid, p_roles text[]) from public, anon, authenticated;
revoke all on function public.calculate_building_score(building_uuid uuid) from public, anon, authenticated;
revoke all on function public.check_group_member(target_group_id uuid) from public, anon, authenticated;
revoke all on function public.country_name_to_code(p_country text) from public, anon, authenticated;
revoke all on function public.fix_orphaned_user_buildings() from public, anon, authenticated;
revoke all on function public.get_admin_dashboard_stats() from public, anon, authenticated;
revoke all on function public.get_architect_claim_status(p_architect_id uuid) from public, anon, authenticated;
revoke all on function public.get_buildings_in_collections(p_collection_ids uuid[], p_folder_ids uuid[]) from public, anon, authenticated;
revoke all on function public.get_buildings_with_awards(p_award_id uuid, p_outcome text, p_year_from integer, p_year_to integer) from public, anon, authenticated;
revoke all on function public.get_explorer_feed(p_user_id uuid, p_limit integer) from public, anon, authenticated;
revoke all on function public.get_main_feed(p_limit integer, p_offset integer, p_show_group_activity boolean) from public, anon, authenticated;
revoke all on function public.get_my_group_ids() from public, anon, authenticated;
revoke all on function public.get_photo_heatmap_data() from public, anon, authenticated;
revoke all on function public.get_user_ambassador_membership() from public, anon, authenticated;
revoke all on function public.is_chapter_president(p_chapter_id uuid) from public, anon, authenticated;
revoke all on function public.is_group_admin(check_group_id uuid) from public, anon, authenticated;
revoke all on function public.is_group_member(_group_id uuid) from public, anon, authenticated;
revoke all on function public.is_mutual(user_a uuid, user_b uuid) from public, anon, authenticated;
revoke all on function public.is_mutual_contact(user_id_a uuid, user_id_b uuid) from public, anon, authenticated;
revoke all on function public.is_national_president_of_local_chapter_parent(p_chapter_id uuid) from public, anon, authenticated;
revoke all on function public.is_user_verified_architect(p_user_id uuid) from public, anon, authenticated;
revoke all on function public.make_city_slug(p_city text) from public, anon, authenticated;
revoke all on function public.make_locality_slug(p_city text, p_country_code text) from public, anon, authenticated;
revoke all on function public.migrate_tags_to_collections() from public, anon, authenticated;
revoke all on function public.refresh_locality_hero_images() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.search_films_debug(p_query text, p_genre_ids integer[], p_countries text[], p_decade_starts integer[], p_runtime_min integer, p_runtime_max integer, p_limit integer, p_offset integer) from public, anon, authenticated;
revoke all on function public.send_session_reminders() from public, anon, authenticated;
revoke all on function public.update_building_community_preview(p_building_id uuid) from public, anon, authenticated;
revoke all on function public.update_group_stats(target_group_id uuid) from public, anon, authenticated;
