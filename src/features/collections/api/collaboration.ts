/**
 * collaboration.ts — data access for the collection collaboration-request flow.
 *
 * Wraps the collection_collaboration_requests reads and the two SECURITY DEFINER
 * RPCs (request_collection_collaboration / review_collection_collaboration). Kept in
 * an api/ module so the Supabase browser client stays out of hooks/components.
 * RPC errors are rethrown with their raw Postgres message so callers can map them
 * to friendly copy.
 */
import { supabase } from "@/integrations/supabase/client";

export type CollaborationRequestStatus = "pending" | "accepted" | "rejected";

export interface PendingCollaborationRequest {
  id: string;
  created_at: string;
  message: string | null;
  requester: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

/** The current user's latest request status for a collection (null if none). */
export async function fetchMyCollaborationRequestStatus(
  collectionId: string,
): Promise<CollaborationRequestStatus | null> {
  const { data, error } = await supabase
    .from("collection_collaboration_requests")
    .select("status")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as CollaborationRequestStatus | undefined) ?? null;
}

/** Owner-side: pending requests awaiting accept/reject for a collection. */
export async function fetchPendingCollaborationRequests(
  collectionId: string,
): Promise<PendingCollaborationRequest[]> {
  const { data, error } = await supabase
    .from("collection_collaboration_requests")
    .select("id, created_at, message, requester:profiles!requester_id(id, username, avatar_url)")
    .eq("collection_id", collectionId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PendingCollaborationRequest[];
}

/** Submit a request to collaborate. Throws Error(rpcMessage) on failure. */
export async function requestCollectionCollaboration(
  collectionId: string,
  message?: string,
): Promise<void> {
  const { error } = await supabase.rpc("request_collection_collaboration", {
    p_collection_id: collectionId,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

/** Owner accepts (approve=true → editor contributor) or rejects a request. */
export async function reviewCollectionCollaboration(params: {
  requestId: string;
  approve: boolean;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("review_collection_collaboration", {
    p_request_id: params.requestId,
    p_approve: params.approve,
    p_note: params.note,
  });
  if (error) throw new Error(error.message);
}

/**
 * Best-effort: email a user that they were added as a collaborator on a collection.
 * The in-app notification and the contributor row are the source of truth; email is a
 * bonus, so a failure here is logged and swallowed rather than surfaced to the owner.
 * Invoked after either add path (direct add, or approving a request-to-collaborate).
 */
export async function notifyCollaboratorByEmail(
  collectionId: string,
  recipientId: string,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify-collection-collaborator", {
      body: { collectionId, recipientId },
    });
    if (error) console.warn("notify-collection-collaborator failed", error);
  } catch (e) {
    console.warn("notify-collection-collaborator threw", e);
  }
}
