# 0023 — A building is searchable by its architect at query time, not through `search_vector`

**Status:** accepted (2026-07-30)

**Context.** `buildings.search_vector` is maintained by the `buildings_search_vector_update` trigger
from six of the building's own columns (`name`, `alt_name`, `aliases`, `address`, `city`, `country`).
It has never carried credited people or firms, so
[`search_buildings_v2`](../../supabase/migrations/20271192000000_search_buildings_v2_credit_name_search.sql) —
the authoritative ranked text search behind `/search` Find mode and the collection
"not in this collection" suggestions — could not find a building by its architect. Against
production, `zaha` returned *Hanaha* and *Zazzle*; `zaha hadid` returned *Hanaha* alone, and none of
Zaha Hadid Architects' buildings.

Two other surfaces already matched credits, so the product contradicted itself:
`get_buildings_list` (the Browse SERP) ILIKEs credit names, and the client-side in-collection filter
[`filterCollectionItems.ts`](../../src/features/collections/filterCollectionItems.ts) folds credit
names into its haystack. An item you could find *inside* a collection by its architect was
unfindable in the database — which is how the gap surfaced.

**Decision.** Resolve credit names **at query time**, inside `search_buildings_v2`, as a
`credit_hits` CTE that maps matching `people`/`companies` rows to buildings through
`building_credits`, LEFT JOINed to the main scan. A credit match is its own qualifying branch in the
`WHERE`, and contributes `0.35 × strict_word_similarity` to `rank_score`.

Three details that are load-bearing:

- **`strict_word_similarity` at an explicit `0.6`.** Measured over production's 16,447 company
  names: `similarity` is whole-string, so it scores a real firm below the noise floor as soon as the
  firm has a suffix (`similarity('Zaha Hadid Architects', 'zaha') = 0.227`, under the RPC's own 0.2
  trigram floor). Plain `word_similarity` fixes that but matches any word *prefix*, so `ar` matched
  4,938 of 16,447 companies. `strict_word_similarity` requires whole words: every real query lands
  on 1.000 — three-letter firm names (OMA, BIG, SOM, MVRDV) included — typos sit at ~0.6
  (`zha hadid` → 0.615), and noise collapses (`zaha`/*Hanaha* → 0.200, `ar` → 0.167).
- **Two index-driven predicates ahead of that filter.** `strict_word_similarity(…) >= 0.6` is not
  indexable and seq-scans all 16,447 companies (380ms measured, against 10ms). `name ILIKE '%q%'`
  and `q <<% name` both are, and the planner BitmapOrs them over the one existing
  `companies_name_trgm_idx` / `people_name_trgm_idx`. `<<%` reads
  `pg_trgm.strict_word_similarity_threshold` (default 0.6, set by nothing in this codebase) and is
  what buys typo tolerance; the ILIKE path is GUC-independent, so a session that ever raised that
  GUC degrades the branch to "no typo tolerance", never to "no architect search".
- **Queries under three characters skip the branch.** `strict_word_similarity` treats a short query
  as a whole word, so `de` legitimately matches 208 firms and would bury a two-letter *name* search
  under other people's buildings.

**Rejected alternative: fold credit names into `buildings.search_vector`.** It would have given
token-AND across building *and* credit fields in one tsquery (`zaha london`), which the branch above
cannot do. Rejected on write cost and on the invariant it creates:

- Every write to `building_credits` (31,563 rows) would have to UPDATE the parent building — a heap
  rewrite plus a GIN index update per credit touched. A bulk credit import would double-write
  `buildings`.
- Renaming a company or person (16,447 companies) would have to fan out to every building it is
  credited on; one firm holds hundreds.
- It adds a third table whose writes must remember to refresh a column on a different table,
  enforced only by a trigger nobody reads. This repo has been bitten twice by that exact shape:
  [ADR 0022](0022-building-merge-invariants.md)'s merge cycle, and the `collections` editor RLS
  policy that silently matched zero rows from the day it was written.

The query-time branch needs no new index, no backfill, no re-index and no trigger. Measured warm on
production, `search_buildings_v2` costs ~310–370ms whether or not the query hits a credit
(`farnsworth`, no credit hits: 344ms; `zaha`, 20 credit hits: 308ms) — the RPC's pre-existing
per-row cost dominates, and the branch is inside the noise.

**Consequences we accept.**

- **No token-AND across building and credit fields.** `zaha london` matches neither a credit name nor
  a building name, so it still returns nothing. Only the `search_vector` design would fix that, at
  the write cost above.
- **Diacritics are not folded.** `search_vector` uses the `simple` dictionary with no `unaccent`, and
  the credit branch inherits that: `siza` finds *Álvaro Siza Vieira* (trigram-wise the accent is on
  another word), but an accented firm name queried unaccented may not match. Unchanged from the
  pre-existing behaviour of every other field.
- **A credit match ranks below a building the user named outright.** `0.35 × sim` plus the popularity
  term lands a perfect credit match at ~0.42, against 0.87–1.08 for an exact name hit and 0.19–0.21
  for trigram noise — deliberately above the 0.2 floor
  [`useCollectionSearchSuggestions`](../../src/features/collections/hooks/useCollectionSearchSuggestions.ts)
  applies, and deliberately below a name hit. Buildings that match by name score exactly what they
  scored before: the new term is 0 for them.
