import { Link } from "react-router";
import { BadgeCheck, Circle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FeedEntry } from "../pages/BuildingDetails";

export function StreamAuthorAttribution({
  user,
  rating,
}: {
  user: FeedEntry["user"];
  rating: number | null;
}) {
  const name = user.username?.trim();
  if (!name) return null;

  return (
    <div className="flex gap-3 items-start min-w-0">
      <Avatar className="h-12 w-12 shrink-0 rounded-none border border-border-default bg-surface-muted">
        <AvatarImage src={user.avatar_url || undefined} alt="" />
        <AvatarFallback className="text-sm font-semibold text-text-secondary rounded-none">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            to={`/profile/${name}`}
            className="text-base md:text-lg font-semibold tracking-tight text-text-primary transition-colors hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
          {user.is_architect_of_building ? (
            <span
              className="inline-block h-2 w-2 shrink-0 bg-text-primary"
              aria-label="Architect of this building"
            />
          ) : null}
          {user.is_verified_architect ? (
            <BadgeCheck className="h-4 w-4 shrink-0 text-text-primary" aria-hidden />
          ) : null}
        </div>
        {rating != null ? (
          <div className="mt-1.5 flex gap-0.5" aria-label={`${rating} of 3 points`}>
            {[1, 2, 3].map((i) => (
              <Circle
                key={i}
                className={cn(
                  "h-2.5 w-2.5",
                  i <= rating
                    ? "fill-text-primary text-text-primary"
                    : "fill-transparent text-text-disabled",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
