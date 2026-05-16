import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { cn } from "@/lib/utils";

export interface DetailBylineProps {
  username: string;
  avatarUrl: string | null;
  isVerifiedArchitect: boolean;
  isArchitectOfBuilding: boolean;
  timestamp: string;
  followersCount: number | null;
  userId: string | null | undefined;
  /** When true and viewer is not the author, show follow CTA. */
  showFollow?: boolean;
  /** Current viewer id — when matches author, follow is hidden. */
  viewerUserId?: string | null;
  className?: string;
}

/**
 * Reviewer-forward byline for building detail stream: avatar, name, badge, meta, optional follow.
 */
export function DetailByline({
  username,
  avatarUrl,
  isVerifiedArchitect,
  isArchitectOfBuilding,
  timestamp,
  followersCount,
  userId,
  showFollow = false,
  viewerUserId,
  className,
}: DetailBylineProps) {
  const initial = username.trim().charAt(0).toUpperCase() || "?";
  const isSelf = Boolean(viewerUserId && userId && viewerUserId === userId);
  const showFollowCta = showFollow && userId && !isSelf;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0 rounded-full border border-border-default bg-surface-muted">
          <AvatarImage src={avatarUrl || undefined} alt="" className="h-11 w-11" />
          <AvatarFallback className="text-sm font-semibold text-text-secondary">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <Link
                to={`/profile/${username}`}
                className="text-xl font-black leading-none tracking-tight text-text-primary transition-colors hover:opacity-80"
                onClick={(e) => e.stopPropagation()}
              >
                {username}
              </Link>
              {isArchitectOfBuilding ? (
                <span className="mt-1.5 block w-fit bg-text-primary px-2 py-0.5 font-sans text-2xs font-bold uppercase tracking-[0.1em] text-text-inverse">
                  Designed this
                </span>
              ) : isVerifiedArchitect ? (
                <span className="mt-1.5 block w-fit border border-text-primary px-2 py-0.5 font-sans text-2xs font-bold uppercase tracking-[0.1em] text-text-primary">
                  Architect
                </span>
              ) : null}
            </div>
            {showFollowCta ? (
              <div className="shrink-0">
                <FollowButton userId={userId} hideIfFollowing className="h-8 text-2xs px-2" />
              </div>
            ) : null}
          </div>
          <p className="mt-2 font-sans text-2xs uppercase tracking-[0.12em] text-text-secondary">
            {timestamp}
            {followersCount != null && followersCount > 0 ? (
              <span> · {followersCount} followers</span>
            ) : null}
          </p>
        </div>
      </div>
      <hr className="mt-4 border-0 border-t border-border-default" />
    </div>
  );
}
