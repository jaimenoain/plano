/**
 * Builds the path to a collection's detail page.
 *
 * Route: /:username/map/:slug — see app/routes.ts.
 */
export function collectionPath({
  ownerUsername,
  slug,
}: {
  ownerUsername: string;
  slug: string;
}): string {
  return `/${ownerUsername}/map/${slug}`;
}
