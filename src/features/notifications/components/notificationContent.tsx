import { type ReactNode } from "react";
import { Link } from "react-router";
import { Heart, MessageCircle, UserPlus, Bell, Sparkles, Users, ShieldCheck, Trophy } from "lucide-react";
import type { Notification } from "../types";

/**
 * Badge icon — Lucide, `currentColor`, never lime. Two signal colours only: the heart is red
 * (universal convention) and a shield is `text-primary` (a system event of consequence).
 * Everything else is `text-secondary`; contrast between types comes from the copy, not the icon.
 */
export function notificationIcon(type: Notification["type"]): ReactNode {
  switch (type) {
    case "like":
      return <Heart className="h-3.5 w-3.5 text-feedback-destructive fill-feedback-destructive" />;
    case "comment":
      return <MessageCircle className="h-3.5 w-3.5 text-text-secondary" />;
    case "follow":
      return <UserPlus className="h-3.5 w-3.5 text-text-secondary" />;
    case "friend_joined":
      return <UserPlus className="h-3.5 w-3.5 text-text-secondary" />;
    case "suggest_follow":
      return <Sparkles className="h-3.5 w-3.5 text-text-secondary" />;
    case "recommendation":
      return <Sparkles className="h-3.5 w-3.5 text-text-secondary" />;
    case "visit_request":
      return <Users className="h-3.5 w-3.5 text-text-secondary" />;
    case "architect_verification":
      return <ShieldCheck className="h-3.5 w-3.5 text-text-primary" />;
    case "ambassador_application_received":
      return <ShieldCheck className="h-3.5 w-3.5 text-text-primary" />;
    case "ambassador_application_approved":
    case "ambassador_application_rejected":
      return <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />;
    case "ambassador_membership_review":
      return <ShieldCheck className="h-3.5 w-3.5 text-text-primary" />;
    case "award_win":
      return <Trophy className="h-3.5 w-3.5 text-text-secondary" />;
    case "feedback_status_updated":
    case "feedback_notes_updated":
      return <MessageCircle className="h-3.5 w-3.5 text-text-primary" />;
    case "project_idea_submitted":
      return <Sparkles className="h-3.5 w-3.5 text-text-primary" />;
    case "collection_collab_requested":
      return <Users className="h-3.5 w-3.5 text-text-primary" />;
    case "collection_collab_accepted":
    case "collection_collab_rejected":
    case "collection_collab_added":
      return <Users className="h-3.5 w-3.5 text-text-secondary" />;
    case "contribution_approved":
    case "contribution_flagged":
      return <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />;
    default:
      return <Bell className="h-3.5 w-3.5 text-text-disabled" />;
  }
}

/** Human label for a flagged/approved contribution's content type. */
function contributionLabel(contentType: string | undefined): { label: string; preposition: string } {
  switch (contentType) {
    case "photo":
      return { label: "photo", preposition: "of" };
    case "video":
      return { label: "video", preposition: "of" };
    case "credit":
      return { label: "credit", preposition: "for" };
    case "building":
    default:
      return { label: "building submission", preposition: "for" };
  }
}

/** The bold label above the body copy. */
export function notificationTitle(n: Notification): string {
  switch (n.type) {
    case "architect_verification":
      return n.metadata?.status === "approved"
        ? "Architect Verification Approved"
        : "Architect Verification Declined";
    case "ambassador_application_received":
      return "New Ambassador Application";
    case "ambassador_application_approved":
      return "Application Approved";
    case "ambassador_application_rejected":
      return "Application Declined";
    case "ambassador_membership_review":
      return "Membership Review";
    case "like":
      return "New Like";
    case "comment":
      return "New Comment";
    case "follow":
      return "New Follower";
    case "friend_joined":
      return "Friend Joined";
    case "suggest_follow":
      return "Suggested Follow";
    case "visit_request":
      return "Visit Request";
    case "recommendation":
      return "New Recommendation";
    case "award_win":
      return "Award";
    case "feedback_status_updated":
    case "feedback_notes_updated":
      return "Feedback Update";
    case "project_idea_submitted":
      return "New Project Idea";
    case "collection_collab_requested":
      return "Collaboration Request";
    case "collection_collab_accepted":
      return "Request Approved";
    case "collection_collab_rejected":
      return "Request Declined";
    case "collection_collab_added":
      return "Added as collaborator";
    case "contribution_approved":
      return "Contribution Approved";
    case "contribution_flagged":
      return "Flagged for Review";
    default:
      return "Notification";
  }
}

/** The body copy. Actor names are `font-medium`, never semibold. */
export function notificationText(n: Notification): ReactNode {
  const actorName = n.actor?.username || "Someone";
  const buildingName = n.resource?.building?.name || n.recommendation?.building?.name;

  switch (n.type) {
    case "architect_verification": {
      const architectName = n.architect?.name || "an architect";
      const isApproved = n.metadata?.status === "approved";
      return (
        <span>
          Your request to be verified as <span className="font-medium">{architectName}</span> was{" "}
          <span
            className={
              isApproved
                ? "text-feedback-success font-medium"
                : "text-feedback-destructive font-medium"
            }
          >
            {isApproved ? "approved" : "declined"}
          </span>
        </span>
      );
    }
    case "ambassador_application_received":
      return (
        <span>
          <span className="font-medium">{actorName}</span> applied to join your ambassador chapter
        </span>
      );
    case "ambassador_application_approved": {
      const ch = n.metadata?.chapter_name?.trim();
      return (
        <span>
          Your ambassador application was{" "}
          <span className="text-feedback-success font-medium">approved</span>
          {ch ? (
            <>
              {" "}
              for <span className="font-medium">{ch}</span>
            </>
          ) : null}
        </span>
      );
    }
    case "ambassador_application_rejected": {
      const note = n.metadata?.reviewer_note?.trim();
      return (
        <span>
          Your ambassador application was{" "}
          <span className="text-feedback-destructive font-medium">not approved</span>
          {note ? (
            <>
              . Note: <span className="italic">{note}</span>
            </>
          ) : null}
        </span>
      );
    }
    case "ambassador_membership_review": {
      const who = n.metadata?.member_username?.trim() || actorName;
      const ch = n.metadata?.chapter_name?.trim();
      return (
        <span>
          <span className="font-medium">{who}</span> updated their profile location
          {ch ? (
            <>
              {" "}
              and may no longer match <span className="font-medium">{ch}</span>
            </>
          ) : null}
          . Please review their membership.
        </span>
      );
    }
    case "like":
      return (
        <span>
          <span className="font-medium">{actorName}</span> liked your review of{" "}
          <span className="italic">{buildingName || "a building"}</span>
        </span>
      );
    case "comment":
      return (
        <span>
          <span className="font-medium">{actorName}</span> commented on your review of{" "}
          <span className="italic">{buildingName || "a building"}</span>
        </span>
      );
    case "follow":
      return (
        <span>
          <span className="font-medium">{actorName}</span> started following you
        </span>
      );
    case "friend_joined":
      return (
        <span>
          Your friend <span className="font-medium">{actorName}</span> just joined Plano
        </span>
      );
    case "suggest_follow":
      return (
        <span>
          Welcome! Follow <span className="font-medium">{actorName}</span>, who invited you to join.
        </span>
      );
    case "visit_request":
      return (
        <span>
          <span className="font-medium">@{actorName}</span> wants to visit{" "}
          <span className="italic">{buildingName || "a building"}</span> with you
        </span>
      );
    case "recommendation":
      if (n.recommendation?.status === "visit_with") {
        return (
          <span>
            <span className="font-medium">@{actorName}</span> wants to visit{" "}
            <span className="italic">{buildingName || "a building"}</span> with you
          </span>
        );
      }
      if (n.metadata?.event_slug) {
        const title = n.metadata.event_title?.trim() || "an event";
        return (
          <span>
            <span className="font-medium">@{actorName}</span> recommended{" "}
            <Link
              // TODO: enrich notification metadata with country_code + city_slug to emit locality-scoped URL
              to={`/events/${n.metadata.event_slug}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium italic text-text-primary underline underline-offset-2 hover:opacity-80"
            >
              {title}
            </Link>{" "}
            to you
          </span>
        );
      }
      return (
        <span>
          <span className="font-medium">{actorName}</span> recommended{" "}
          <span className="italic">{buildingName || "a building"}</span> for you
        </span>
      );
    case "award_win":
      return (
        <span>
          Congratulations! Your building{" "}
          <span className="font-medium italic">{buildingName || "a building"}</span> won an award
        </span>
      );
    case "feedback_status_updated":
    case "feedback_notes_updated":
      return (
        <span>
          {n.metadata?.message ?? "Your feedback was updated — open Feedback to see details."}
        </span>
      );
    case "project_idea_submitted": {
      const ideaTitle = n.metadata?.idea_title?.trim();
      return (
        <span>
          <span className="font-medium">{actorName}</span> submitted a project idea
          {ideaTitle ? (
            <>
              : <span className="italic">{ideaTitle}</span>
            </>
          ) : null}
        </span>
      );
    }
    case "collection_collab_requested": {
      const name = n.metadata?.collection_name?.trim();
      return (
        <span>
          <span className="font-medium">{actorName}</span> wants to collaborate on{" "}
          <span className="italic">{name || "your collection"}</span>
        </span>
      );
    }
    case "collection_collab_accepted":
    case "collection_collab_added": {
      const name = n.metadata?.collection_name?.trim();
      return (
        <span>
          <span className="font-medium">{actorName}</span> added you as an editor on{" "}
          <span className="italic">{name || "a collection"}</span>
        </span>
      );
    }
    case "collection_collab_rejected": {
      const name = n.metadata?.collection_name?.trim();
      const note = n.metadata?.reviewer_note?.trim();
      return (
        <span>
          Your request to collaborate on{" "}
          <span className="italic">{name || "a collection"}</span> was{" "}
          <span className="text-feedback-destructive font-medium">not approved</span>
          {note ? (
            <>
              . Note: <span className="italic">{note}</span>
            </>
          ) : null}
        </span>
      );
    }
    case "contribution_approved": {
      const { label, preposition } = contributionLabel(n.metadata?.content_type);
      const name = n.metadata?.building_name?.trim();
      return (
        <span>
          Your {label} {preposition}{" "}
          <span className="italic">{name || "a building"}</span> was{" "}
          <span className="text-feedback-success font-medium">approved</span>
        </span>
      );
    }
    case "contribution_flagged": {
      const { label, preposition } = contributionLabel(n.metadata?.content_type);
      const name = n.metadata?.building_name?.trim();
      const reason = n.metadata?.reason?.trim();
      return (
        <span>
          Your {label} {preposition}{" "}
          <span className="italic">{name || "a building"}</span> was flagged for review
          {reason ? (
            <>
              . Reason: <span className="italic">{reason}</span>
            </>
          ) : null}
        </span>
      );
    }
    default:
      return <span>New notification</span>;
  }
}
