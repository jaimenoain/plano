/**
 * Jaccard-style similarity on character trigram sets — approximates PostgreSQL
 * `pg_trgm.similarity(a, b)` closely enough for client-side duplicate hints (Roadmap 6.1).
 */
function trigramSet(s: string): Set<string> {
  const t = s.trim().toLowerCase();
  const padded = `  ${t} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

/**
 * Returns a score in [0, 1]. Matches the usual `|A ∩ B| / |A ∪ B|` formulation
 * used for trigram similarity in many databases.
 */
export function trigramSimilarity(a: string, b: string): number {
  const A = trigramSet(a);
  const B = trigramSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter += 1;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}
