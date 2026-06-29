import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claimEvent } from "@/features/events/api/eventsApi";
import { eventKeys } from "@/features/events/queryKeys";
import type { EventClaimIdentity, EventDTO } from "@/features/events/types";

type ClaimEventVars = {
  eventId: string;
  slug: string;
  identity: EventClaimIdentity;
};

/**
 * Claim an unclaimed event (via the `claim_event` RPC, see `claimEvent`) and refresh the cached
 * event detail + listings on success. Mirrors `useUpdateEvent`.
 */
export function useClaimEvent() {
  const queryClient = useQueryClient();

  return useMutation<EventDTO, unknown, ClaimEventVars>({
    mutationFn: ({ eventId, slug, identity }) => claimEvent(eventId, slug, identity),
    onSuccess: (_event, { slug }) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(slug) });
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}
