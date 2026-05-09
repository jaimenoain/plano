import type { FunctionalCategory, FunctionalTypology, Attribute } from "@/types/classification";
import type { PersonSummary, CompanySummary } from "@/features/credits/types";

export type SmartSuggestionKind =
  | "category"
  | "typology"
  | "attribute"
  | "person"
  | "company";

export interface SmartSuggestion {
  kind: SmartSuggestionKind;
  /** Stable key for React lists. */
  key: string;
  /** Chip label shown to the user (without the leading "Filter by"). */
  label: string;
  /** Optional secondary count rendered as `(N)`. Only filled when known cheaply. */
  count?: number;
  /** Internal score for ranking; not displayed. */
  score: number;
  /** Filter-application payload: the filter key + value to merge. */
  apply:
    | { key: "category"; value: string }
    | { key: "typologies"; value: string }
    | { key: "attributes"; value: string }
    | { key: "people"; value: { id: string; name: string } }
    | { key: "creditCompany"; value: { id: string; name: string } };
}

interface TaxonomyInput {
  functionalCategories: FunctionalCategory[];
  functionalTypologies: FunctionalTypology[];
  attributes: Attribute[];
}

interface SuggestionInput {
  query: string;
  taxonomy: TaxonomyInput;
  people: PersonSummary[];
  companies: CompanySummary[];
}

const MIN_MATCH_LEN = 3;
const MIN_SCORE = 40;
const MAX_SUGGESTIONS = 3;

function commonPrefixLen(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

/**
 * Score a taxonomy-name match against the user's query. Returns 0 for no
 * match. Higher is better. Tuned to surface obvious matches first ("brutalism"
 * → "Brutalist") without firing on noisy substrings ("a" → every name with
 * an "a" in it).
 *
 * Uses three strategies, in this order:
 *   1. Whole-string equality / prefix / substring.
 *   2. Token-level: any query token vs. any name token.
 *   3. Stem similarity: common-prefix length / min(token length).
 *      Catches "brutalism" ↔ "brutalist" (shared stem "brutali").
 */
function scoreNameMatch(query: string, name: string): number {
  const q = query.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (q.length < MIN_MATCH_LEN || n.length < MIN_MATCH_LEN) return 0;

  if (q === n) return 100;

  const qTokens = q.split(/\s+/).filter((t) => t.length >= MIN_MATCH_LEN);
  const nTokens = n.split(/\s+/).filter((t) => t.length >= MIN_MATCH_LEN);

  let best = 0;
  for (const qt of qTokens) {
    for (const nt of nTokens) {
      if (qt === nt) {
        best = Math.max(best, 90);
        continue;
      }
      if (nt.startsWith(qt)) {
        best = Math.max(best, 80);
        continue;
      }
      if (qt.startsWith(nt)) {
        best = Math.max(best, 70);
        continue;
      }
      if (nt.includes(qt) || qt.includes(nt)) {
        best = Math.max(best, 60);
        continue;
      }
      // Stem-similarity fallback.
      const cp = commonPrefixLen(qt, nt);
      const ratio = cp / Math.min(qt.length, nt.length);
      if (cp >= MIN_MATCH_LEN && ratio >= 0.6) {
        best = Math.max(best, 65);
      }
    }
  }
  if (best > 0) return best;

  // Whole-string fallback for queries / names that didn't tokenise.
  if (n.startsWith(q)) return 80;
  if (q.startsWith(n)) return 70;
  if (n.includes(q) || q.includes(n)) return 50;
  return 0;
}

export function suggestSmartFilters({
  query,
  taxonomy,
  people,
  companies,
}: SuggestionInput): SmartSuggestion[] {
  const q = query.trim();
  if (q.length < MIN_MATCH_LEN) return [];

  const out: SmartSuggestion[] = [];

  // Categories
  for (const cat of taxonomy.functionalCategories) {
    const score = scoreNameMatch(q, cat.name);
    if (score >= MIN_SCORE) {
      out.push({
        kind: "category",
        key: `category:${cat.id}`,
        label: cat.name,
        score,
        apply: { key: "category", value: cat.id },
      });
    }
  }

  // Typologies
  for (const typ of taxonomy.functionalTypologies) {
    const score = scoreNameMatch(q, typ.name);
    if (score >= MIN_SCORE) {
      out.push({
        kind: "typology",
        key: `typology:${typ.id}`,
        label: typ.name,
        score,
        apply: { key: "typologies", value: typ.id },
      });
    }
  }

  // Attributes (styles, materials, contexts, etc.)
  for (const attr of taxonomy.attributes) {
    const score = scoreNameMatch(q, attr.name);
    if (score >= MIN_SCORE) {
      out.push({
        kind: "attribute",
        key: `attribute:${attr.id}`,
        label: attr.name,
        score,
        apply: { key: "attributes", value: attr.id },
      });
    }
  }

  // Top person from the search results — only if it's a real architect (has
  // credits) and the name match is strong. Search-RPC ordering already places
  // the best match first; we just gate by score to avoid noisy chips.
  const topPerson = people[0];
  if (topPerson && topPerson.creditCount && topPerson.creditCount > 0) {
    const score = scoreNameMatch(q, topPerson.name);
    if (score >= MIN_SCORE) {
      out.push({
        kind: "person",
        key: `person:${topPerson.id}`,
        label: topPerson.name,
        count: topPerson.creditCount,
        score: score + 5,
        apply: { key: "people", value: { id: topPerson.id, name: topPerson.name } },
      });
    }
  }

  // Top company from the search results.
  const topCompany = companies[0];
  if (topCompany && topCompany.creditCount > 0) {
    const score = scoreNameMatch(q, topCompany.name);
    if (score >= MIN_SCORE) {
      out.push({
        kind: "company",
        key: `company:${topCompany.id}`,
        label: topCompany.name,
        count: topCompany.creditCount,
        score: score + 5,
        apply: { key: "creditCompany", value: { id: topCompany.id, name: topCompany.name } },
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, MAX_SUGGESTIONS);
}
