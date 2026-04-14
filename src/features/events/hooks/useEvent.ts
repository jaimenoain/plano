import { useQuery } from "@tanstack/react-query";
import { getEventBySlug } from "@/features/events/api/eventsApi";
import { eventKeys } from "@/features/events/queryKeys";

/**
 * Event detail for `/events/:slug`. Fresh on each mount (`staleTime: 0`).
 */
export function useEvent(slug: string) {
  const trimmed = slug.trim();
  return useQuery({
    queryKey: eventKeys.detail(trimmed),
    queryFn: () => getEventBySlug(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 0,
  });
}
