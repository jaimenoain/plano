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
    | "project_idea_submitted";
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
  };
  recommendation?: {
    id?: string;
    status?: string | null;
    building?: { name: string | null } | null;
  } | null;
}
