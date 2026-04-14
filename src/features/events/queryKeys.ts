/**
 * TanStack Query keys for events (`src/features/events/api/eventsApi.ts`).
 * Mirrors the `personQueryKey` / `companyQueryKey` pattern with a grouped factory.
 */
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (page: number) => [...eventKeys.lists(), page] as const,
  detail: (slug: string) => [...eventKeys.all, "detail", slug] as const,
  attendance: (userId: string | undefined, eventId: string) =>
    [...eventKeys.all, "attendance", userId ?? "anon", eventId] as const,
  byBuilding: (buildingId: string) => [...eventKeys.all, "building", buildingId] as const,
  profile: (userId: string, segment: "organising" | "attending" | "interested") =>
    [...eventKeys.all, "profile", userId, segment] as const,
  profilePast: (userId: string, status: "going" | "interested") =>
    [...eventKeys.all, "profile", userId, "past", status] as const,
  profilePastCount: (userId: string, status: "going" | "interested") =>
    [...eventKeys.all, "profile", userId, "past-count", status] as const,
};
