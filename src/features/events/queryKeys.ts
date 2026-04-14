/**
 * TanStack Query keys for events (`src/features/events/api/eventsApi.ts`).
 * Mirrors the `personQueryKey` / `companyQueryKey` pattern with a grouped factory.
 */
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (page: number) => [...eventKeys.lists(), page] as const,
  detail: (slug: string) => [...eventKeys.all, "detail", slug] as const,
  byBuilding: (buildingId: string) => [...eventKeys.all, "building", buildingId] as const,
};
