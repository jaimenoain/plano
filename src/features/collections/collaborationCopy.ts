/**
 * collaborationCopy.ts — pure copy/state helpers for the collection collaboration
 * flow. No React/Supabase deps so they can be unit-tested and shared between the
 * request hook (error→toast mapping) and the header CTA (status→button state).
 */
import type { CollaborationRequestStatus } from "./api/collaboration";

/** Maps a raw request RPC error message to friendly copy. */
export function friendlyRequestError(message: string): string {
  switch (message) {
    case "already_owner":
      return "You already own this collection.";
    case "already_contributor":
      return "You're already a collaborator on this collection.";
    case "pending_exists":
      return "You already have a pending request for this collection.";
    case "collection_not_found":
      return "This collection no longer exists.";
    case "not_authenticated":
      return "Please sign in to request collaboration.";
    default:
      return "Couldn't send your request. Please try again.";
  }
}

/** Maps a raw review RPC error message to friendly copy. */
export function friendlyReviewError(message: string): string {
  switch (message) {
    case "already_reviewed":
      return "This request has already been handled.";
    case "not_authorized":
      return "Only the collection owner can respond to this request.";
    case "request_not_found":
      return "This request no longer exists.";
    default:
      return "Couldn't update the request. Please try again.";
  }
}

/**
 * The header CTA state for a logged-in non-collaborator, given their latest
 * request status. "pending"/"accepted" show a disabled pending button (an
 * accepted request is briefly in flight before the viewer becomes an editor);
 * "rejected" allows re-requesting; no request shows the default invite.
 */
export type CollaborationCtaState =
  | { kind: "pending" }
  | { kind: "request"; label: string };

export function collaborationCtaState(
  status: CollaborationRequestStatus | null | undefined,
): CollaborationCtaState {
  if (status === "pending" || status === "accepted") return { kind: "pending" };
  if (status === "rejected") return { kind: "request", label: "Request again" };
  return { kind: "request", label: "Request to collaborate" };
}
