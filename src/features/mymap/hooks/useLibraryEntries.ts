/**
 * The member's whole library as lightweight rows (place + status + rating).
 * One cache entry shared by the /map masthead and the feed rail's My Map
 * module, so opening either primes the other.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchLibraryPins } from "@/features/feed/api/railApi";

export function useLibraryEntries(userId: string | undefined) {
  return useQuery({
    queryKey: ["library-entries", userId],
    queryFn: () => fetchLibraryPins(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
