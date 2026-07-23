/** One row of `public.notifications`, joined with its actor / resource / recommendation. */
export interface Notification {
  id: string;
  created_at: string;
  type:
    | "follow"
    | "like"
    | "comment"
    | "friend_joined"
    | "suggest_follow"
    | "recommendation"
    | "visit_request"
    | "architect_verification"
    | "ambassador_application_received"
    | "ambassador_application_approved"
    | "ambassador_application_rejected"
    | "ambassador_membership_review"
    | "award_win"
    | "feedback_status_updated"
    | "feedback_notes_updated"
    | "project_idea_submitted"
    | "collection_collab_requested"
    | "collection_collab_accepted"
    | "collection_collab_rejected"
    | "collection_collab_added"
    | "contribution_approved"
    | "contribution_flagged";
  is_read: boolean;
  actor_id: string;
  recommendation_id?: string | null;
  architect_id?: string | null;
  actor: {
    username: string | null;
    avatar_url: string | null;
  };
  architect?: {
    name: string | null;
  };
  resource?: {
    id: string;
    user_id: string;
    user?: { username: string | null };
    building?: { name: string };
  };
  metadata?: {
    status?: string;
    event_slug?: string;
    event_title?: string;
    application_id?: string;
    chapter_id?: string;
    chapter_name?: string;
    reviewer_note?: string | null;
    membership_id?: string;
    member_username?: string;
    feedback_id?: string;
    message?: string;
    idea_title?: string;
    request_id?: string;
    collection_id?: string;
    collection_slug?: string;
    collection_name?: string;
    owner_username?: string;
    content_type?: "building" | "photo" | "video" | "credit";
    building_id?: string;
    building_name?: string;
    building_slug?: string;
    building_short_id?: number;
    reason?: string;
  };
  recommendation?: {
    id?: string;
    status?: string | null;
    building?: { name: string | null } | null;
  } | null;
}
