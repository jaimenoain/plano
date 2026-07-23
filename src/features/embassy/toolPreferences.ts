// Single source of truth for the Contribute-tool keys shared by the onboarding
// preference picker (/embassy/welcome) and the Contribute page ordering.
export const TOOL_KEYS = [
  "research",
  "photography",
  "outreach",
  "curation",
  "community",
  "events",
] as const;

export type ToolKey = (typeof TOOL_KEYS)[number];

// Older onboarding builds saved "moderation" for the tool Contribute registers
// as "curation"; stored preferences are never rewritten, so map on read.
const LEGACY_KEY_MAP: Record<string, ToolKey> = {
  moderation: "curation",
};

export function normalizeToolPreferences(
  preferred: string[] | null | undefined,
): ToolKey[] {
  if (!preferred) return [];
  const seen = new Set<ToolKey>();
  const result: ToolKey[] = [];
  for (const raw of preferred) {
    const key = LEGACY_KEY_MAP[raw] ?? raw;
    if ((TOOL_KEYS as readonly string[]).includes(key) && !seen.has(key as ToolKey)) {
      seen.add(key as ToolKey);
      result.push(key as ToolKey);
    }
  }
  return result;
}
