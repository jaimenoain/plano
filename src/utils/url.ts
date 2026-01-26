export const getBuildingUrl = (id: string, slug?: string | null, shortId?: number | null) => {
  if (shortId && slug) {
    return `/building/${shortId}/${slug}`;
  }
  return `/building/${id}`;
};
