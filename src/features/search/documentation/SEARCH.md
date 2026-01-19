# Search Architecture & Troubleshooting

This document explains the architecture of the Search functionality in CineForum, including the 3-Tier system, data fetching strategies, and common pitfalls.

## 1. The 3-Tier Search System

The search results are aggregated from three distinct sources, prioritized by relevance to the user's social circle:

*   **Tier 1: Friend Activity**
    *   **Source:** Local Database (`films`, `log` tables).
    *   **Logic:** Films that the current user's friends have interacted with (rated, watched, etc.).
    *   **Sorting:** Friend Rating (descending), then Latest Interaction (descending).
    *   **Badge:** Displayed with a "Friend Activity" indicator (implied by context or explicit badges in some views).

*   **Tier 2: Community**
    *   **Source:** Local Database (`films` table).
    *   **Logic:** Films present in our local database but *not* interacted with by friends. These are films other users in the platform have added.
    *   **Sorting:** Popularity (Vote Count desc, Vote Average desc).

*   **Tier 3: Global (TMDB)**
    *   **Source:** The Movie Database (via `tmdb-search` Edge Function).
    *   **Logic:** Films fetched dynamically from TMDB APIs when local results are insufficient.
    *   **Filtering:** Results are deduplicated against Tier 1 & 2 (we don't show the same film twice).
    *   **Note:** Tier 3 is **disabled** if "Restrictive Filters" are active (see below).

## 2. Data Fetching Strategy

The search implementation uses a hybrid approach:

### A. Server-Side RPC (`search_films_tiered`)
*   **Purpose:** Fetches Tier 1 and Tier 2 results efficiently in a single database round-trip.
*   **Location:** Postgres function in Supabase.
*   **Capabilities:** Handles complex filtering (genres, decades, availability, watchlist status) on local data.
*   **Signature (v17):**
    ```sql
    search_films_tiered(
        p_query TEXT,
        p_genre_ids INTEGER[],
        p_countries TEXT[],
        p_decade_starts INTEGER[],
        p_runtime_min INTEGER,
        p_runtime_max INTEGER,
        p_limit INTEGER,
        p_offset INTEGER,
        p_user_country TEXT,
        p_only_my_platforms BOOLEAN,
        p_my_platforms TEXT[],
        p_rent_buy BOOLEAN,
        p_watchlist_user_id UUID,
        p_seen_by_user_id UUID,
        p_not_seen_by_user_id UUID,
        p_rated_by_user_ids UUID[],
        p_media_type TEXT -- 'movie' or 'tv'
    )
    ```

### B. Edge Function (`tmdb-search`)
*   **Purpose:** Fetches Tier 3 (Global) results.
*   **Invocation:** Called by the client only if Tier 1/2 results are exhausted (pagination) or insufficient.
*   **Logic:** Maps local filters (genres, dates) to TMDB API query parameters.

### C. Client-Side Post-Processing
*   **Availability:** For Tier 3 results, availability is checked client-side against the `film_availability` table (if enabled).
*   **Deduplication:** The client removes items returned by TMDB if they already appeared in the RPC results.

## 3. Filters & URL Persistence

The search page is "fragile" because of the complex state synchronization between React state and URL parameters.

### Restrictive Filters
If any of these filters are active, **Tier 3 (TMDB) is disabled**. We only search the local database because we cannot query TMDB for "films my friend watched".
*   `watchlist` (User Watchlist)
*   `seen_by` / `seen_by_user` (Watched by User)
*   `rated_by` (Rated by Friends)
*   `tags` (Local Tags)

### URL Strategy (Usernames vs UUIDs)
To make URLs shareable, we persist **Usernames** in the URL, not UUIDs.
*   **URL:** `?watchlist=jules`
*   **State:** `watchlistUser = "jules"`
*   **Logic:** The component asynchronously resolves "jules" -> `UUID` using the `profiles` table before calling the RPC.
*   **Pitfall:** Ensure the resolution logic handles race conditions and debouncing.

## 4. Common Pitfalls & Mistakes

1.  **RPC Signature Mismatch:** The `search_films_tiered` function has many arguments. Adding one requires updating the SQL definition *and* the calling code in `Search.tsx` (or `useTieredSearch.ts`). Order matters!
2.  **Type Casting:**
    *   `tmdb_id` is `BIGINT` in DB, but `INTEGER` in RPC return types. Always cast `::integer`.
    *   `release_date` is `DATE` or `TEXT`. Ensure consistent formatting (`YYYY-MM-DD`).
3.  **Tier 3 Availability:** Availability data (`film_availability`) is keyed by `tmdb_id`, not internal `uuid`. Tier 3 items from TMDB *only* have `id` (which is the TMDB ID). The logic must handle this distinction.
4.  **"Not Seen By" Logic:**
    *   "Not Seen By Me" means excluding films where `log.user_id = me` AND `status = 'watched'`.
    *   This logic is applied in the RPC for Tier 1/2.
    *   For Tier 3, we must fetch a check list from the DB to exclude items client-side (since we can't tell TMDB "exclude films user X watched").

## 5. Directory Structure (Refactored)

*   `src/pages/Search.tsx`: Main UI component (View).
*   `src/hooks/useSearchFilters.ts`: Manages URL state and Username->UUID resolution (Controller).
*   `src/hooks/useTieredSearch.ts`: Manages data fetching and tier merging logic (Model/Service).
