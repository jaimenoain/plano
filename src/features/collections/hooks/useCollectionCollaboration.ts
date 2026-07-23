/**
 * useCollectionCollaboration.ts
 *
 * React Query hooks for the collection collaboration-request flow: a logged-in
 * non-collaborator asks a collection owner for edit access; the owner accepts
 * (→ editor contributor) or rejects. Data access lives in ../api/collaboration;
 * these hooks own caching, invalidation, and error→toast mapping.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMyCollaborationRequestStatus,
  fetchPendingCollaborationRequests,
  requestCollectionCollaboration,
  reviewCollectionCollaboration,
  type CollaborationRequestStatus,
  type PendingCollaborationRequest,
} from "../api/collaboration";
import { friendlyRequestError, friendlyReviewError } from "../collaborationCopy";

export type { CollaborationRequestStatus, PendingCollaborationRequest };

/**
 * The current user's latest collaboration request for a collection (or null).
 * Enable only when the viewer is logged in and not already an editor/owner.
 */
export function useMyCollaborationRequest(collectionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["collection_collab_request", "mine", collectionId],
    enabled: !!collectionId && enabled,
    queryFn: () => fetchMyCollaborationRequestStatus(collectionId as string),
  });
}

/** Owner-side: pending requests awaiting accept/reject for a collection. */
export function usePendingCollaborationRequests(collectionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["collection_collab_request", "pending", collectionId],
    enabled: !!collectionId && enabled,
    queryFn: () => fetchPendingCollaborationRequests(collectionId as string),
  });
}

/** Submit a request to collaborate. Shows a toast on success/failure. */
export function useRequestCollaboration(collectionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message?: string) => {
      if (!collectionId) throw new Error("collection_not_found");
      await requestCollectionCollaboration(collectionId, message);
    },
    onSuccess: () => {
      toast.success("Request sent to the owner.");
      void queryClient.invalidateQueries({
        queryKey: ["collection_collab_request", "mine", collectionId],
      });
    },
    onError: (error: Error) => {
      toast.error(friendlyRequestError(error.message));
    },
  });
}

/** Owner accepts or rejects a request. Shows a toast and refreshes lists. */
export function useReviewCollaboration(collectionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      approve,
      note,
    }: {
      requestId: string;
      approve: boolean;
      note?: string;
    }) => {
      await reviewCollectionCollaboration({ requestId, approve, note });
      return approve;
    },
    onSuccess: (approved) => {
      toast.success(approved ? "Collaborator added." : "Request declined.");
      void queryClient.invalidateQueries({
        queryKey: ["collection_collab_request", "pending", collectionId],
      });
      void queryClient.invalidateQueries({ queryKey: ["collection_contributors", collectionId] });
    },
    onError: (error: Error) => {
      toast.error(friendlyReviewError(error.message));
    },
  });
}
