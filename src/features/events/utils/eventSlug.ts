/** Lowercase kebab slug segment from a human title (no trailing empty segment). */
export function titleToEventSlugSegment(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "event";
}

/** Short random suffix for `events.slug` uniqueness (avoids extra npm deps). */
export function randomEventSlugSuffix(length = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]!).join("");
}

export function makeEventSlug(title: string): string {
  return `${titleToEventSlugSegment(title)}-${randomEventSlugSuffix()}`;
}
