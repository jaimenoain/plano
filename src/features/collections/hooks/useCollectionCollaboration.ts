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
  notifyCollaboratorByEmail,
  requestCollectionCollaboration,
  reviewCollectionCollaboration,
  withdrawCollectionCollaboration,
  type CollaborationRequestStatus,
  type PendingCollaborationRequest,
} from "../api/collaboration";
import {
  friendlyRequestError,
  friendlyReviewError,
  friendlyWithdrawError,
} from "../collaborationCopy";

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

/**
 * Withdraw a still-pending request (undo). Shows a toast on success/failure and
 * refreshes both the requester's own status and the owner's pending list, in case
 * the owner has that collection's settings open at the same time.
 */
export function useWithdrawCollaboration(collectionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => withdrawCollectionCollaboration(requestId),
    onSuccess: () => {
      toast.success("Request withdrawn.");
      void queryClient.invalidateQueries({
        queryKey: ["collection_collab_request", "mine", collectionId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["collection_collab_request", "pending", collectionId],
      });
    },
    onError: (error: Error) => {
      toast.error(friendlyWithdrawError(error.message));
    },
  });
}

/**
 * Submit a request to collaborate. On success, shows a toast with an "Undo" action
 * (a few seconds to change your mind) that withdraws the just-created request.
 */
export function useRequestCollaboration(collectionId: string | undefined) {
  const queryClient = useQueryClient();
  const withdraw = useWithdrawCollaboration(collectionId);
  return useMutation({
    mutationFn: async (message?: string) => {
      if (!collectionId) throw new Error("collection_not_found");
      return requestCollectionCollaboration(collectionId, message);
    },
    onSuccess: (requestId) => {
      toast.success("Request sent to the owner.", {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => withdraw.mutate(requestId),
        },
      });
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
      /** Requester being approved — used to email them (the RPC handles the in-app row). */
      recipientId?: string;
    }) => {
      await reviewCollectionCollaboration({ requestId, approve, note });
      return approve;
    },
    onSuccess: (approved, variables) => {
      toast.success(approved ? "Collaborator added." : "Request declined.");
      void queryClient.invalidateQueries({
        queryKey: ["collection_collab_request", "pending", collectionId],
      });
      void queryClient.invalidateQueries({ queryKey: ["collection_contributors", collectionId] });
      // The approve branch of review_collection_collaboration already inserts the
      // in-app notification; email is the only missing piece here (best-effort).
      if (approved && collectionId && variables.recipientId) {
        void notifyCollaboratorByEmail(collectionId, variables.recipientId);
      }
    },
    onError: (error: Error) => {
      toast.error(friendlyReviewError(error.message));
    },
  });
}
