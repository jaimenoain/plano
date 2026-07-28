/**
 * searchText.ts
 *
 * Shared normalisation for client-side, in-memory text matching (filtering a
 * list you already hold — not the Postgres `pg_trgm` search behind the search
 * RPCs).
 *
 * Diacritics are folded so that typing `gaudi` finds "Gaudí" and typing
 * "Gaudí" still finds a record stored as "Gaudi". That matters more here than
 * in most apps: architecture names are full of them (Gaudí, Jørn Utzon, Museu,
 * Mies van der Rohe's Barcelona pavilion).
 *
 * The NFD + combining-marks lines mirror `slugify` in `@/utils/url` — that one
 * also hyphenates and is for URLs, so it can't be reused for matching.
 */

/** Unicode combining diacritical marks, exposed by NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Fold diacritics, lowercase, and collapse runs of whitespace. */
export function normalizeSearchText(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a query into normalised tokens. Every token must match for a record to
 * be kept (AND), so `zaha london` narrows instead of widening.
 */
export function tokenize(query: string | null | undefined): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

/** True when every token appears somewhere in the (already normalised) haystack. */
export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}

/** Join arbitrary fields into one normalised haystack string. */
export function buildHaystack(parts: (string | number | null | undefined)[]): string {
  return parts
    .map((part) => normalizeSearchText(part))
    .filter(Boolean)
    .join(" ");
}
