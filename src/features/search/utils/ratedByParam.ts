/**
 * Compute the `rated_by` URL param value (null = delete the param).
 *
 * Self is added by profile username — the canonical one in `profiles` — never
 * from JWT user_metadata, which is stamped at signup and goes stale on rename.
 * The library RPCs match `rated_by` against `profiles.username`, so a stale
 * name silently zeroes out My Library. While the profile (or a deep-linked
 * rated_by resolution) is still loading, the existing param is preserved so it
 * isn't stripped and re-added (URL thrash); if the profile never yields a
 * username, self is simply omitted — the RPCs scope the status filter by
 * auth.uid() server-side, so My Library still works.
 */
export function buildRatedByParam({
  profileUsername,
  profileLoading,
  includeSelf,
  contactUsernames,
  isLoadingRatedBy,
  existingParam,
}: {
  profileUsername: string | null;
  profileLoading: boolean;
  includeSelf: boolean;
  contactUsernames: string[];
  isLoadingRatedBy: boolean;
  existingParam: string | null;
}): string | null {
  const ratedByUsers = new Set<string>();
  if (includeSelf && profileUsername) {
    ratedByUsers.add(profileUsername);
  }
  contactUsernames.forEach((u) => ratedByUsers.add(u));

  if (ratedByUsers.size > 0) return Array.from(ratedByUsers).join(",");
  if ((isLoadingRatedBy || profileLoading) && existingParam) return existingParam;
  return null;
}
