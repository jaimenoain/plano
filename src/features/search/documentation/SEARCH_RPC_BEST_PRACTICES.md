# Search RPC Fixes & Best Practices: `search_films_tiered`

This document synthesizes technical learnings, regression fixes, and strict implementation rules for the `search_films_tiered` RPC function.

---

## 1. Critical Scope & Type Rules

### Ambiguous Column References

* **The Issue:** The function returns a column named `id`, which creates a variable `id` in the function's scope.
* **The Error:** Using a bare `SELECT id` in subqueries (especially `WHERE ... NOT IN`) causes an "ambiguous column reference" error because Postgres confuses the table column with the return variable.
* **The Rule:** You **MUST** strictly alias tables and qualify columns in subqueries (e.g., `SELECT t1.id FROM tier1_candidates t1`).

### Integer Type Safety (`BigInt` vs `Integer`)

* **The Issue:** Columns like `tmdb_id` and `vote_count` (mapped from `community_rating_count`) are often stored as `bigint` in the database, but TypeScript interfaces and RPC signatures expect `integer`.
* **The Rule:** Do not rely on implicit casting. You must explicitly cast these columns to `::integer` inside the SQL function (e.g., `f.tmdb_id::integer`).
* **General Logic:** Avoid casting columns to `TEXT` simply to perform logic that can be done natively with the column's type.

---

## 2. Date Handling & Logic

### Invalid Operators (Regex on Dates)

* **The Incident:** A migration failed with `operator does not exist: date ~ unknown` (Code: 42883) because it attempted to use a Regex Match operator (`~`) on `release_date`, which is a strict `DATE` type.
* **The Cause:** Postgres regex operators expect strings; `release_date` is not a string, even if it looks like one in JSON.
* **The Rule:** Use strict Date constructors for comparisons. Avoid applying text operators (like `ILIKE` or `~`) to date columns.

### Preferred Date Logic

* **Implementation:** While `EXTRACT(YEAR FROM ...)` is a valid fix for basic logic, the stricter rule for ranges is to use `make_date` constructors to avoid implied text conversion.
* **Bad:** `EXTRACT(YEAR FROM release_date) = 2020`.
* **Good:** `release_date >= make_date(2020, 1, 1) AND release_date < make_date(2021, 1, 1)`.


* **Text Search Limits:** Ensure text search filters (like `p_query`) are strictly applied only to text columns (e.g., `title`) and are not applied to date columns via loose logic.

---

## 3. Schema Verification & Joins

### Join Accuracy (Internal vs. External IDs)

* **The Incident:** A query failed with `column fa.tmdb_id does not exist` (Code: 42703) when attempting to join `film_availability` (alias `fa`) using `tmdb_id`.
* **The Logic:** `film_availability` links to `films` via an internal UUID (`building_id`), not the external `tmdb_id`.
* **The Fix:** Always verify relationships to determine if they use internal UUIDs or external IDs.
```sql
-- CORRECT
WHERE fa.building_id = f.id

```



### Preventative Schema Checks

* **Verification:** Before writing complex joins, explicitly verify the schema (via `\d table_name` or migrations). Do not assume column names based on variable naming conventions.

---

## 4. Debugging & Migration Process

* **Error Analysis:** Inspect the full error object from the Supabase client. Codes like `42883` (operator mismatch) and `42703` (undefined column) provide specific hints regarding line numbers or missing operators.
* **Migration Testing:** Complex RPCs must be tested individually. After creating a migration, call the RPC directly via the Supabase Dashboard or a SQL script with sample parameters to ensure it executes without runtime errors.

Would you like me to generate a specific SQL template for the `search_films_tiered` function that implements these aliasing and type-casting rules?
