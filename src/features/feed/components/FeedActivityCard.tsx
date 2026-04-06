import { Heart, Bookmark, MapPin, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { useState } from "react";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";

// ─── Props ─────────────────────────────────────────────────────────────────────
// Contract is fixed — Cursor must not modify this interface (C7-1 spec).

interface FeedActivityCardProps {
  entry: FeedReview;
  activityStatus: "visited" | "pending";
  onLike?: (reviewId: string) => void;
  size?: "hero" | "compact";
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FeedActivityCard({
  entry,
  activityStatus,
  onLike,
  size = "hero",
}: FeedActivityCardProps) {
  const navigate = useNavigate();
  // Collapses to false when the <img> fires onError — removes the broken zone.
  const [imageVisible, setImageVisible] = useState(true);
  // Local save state. This card has no Supabase write on the bookmark action;
  // the actor has already acted. The bookmark here saves the post/activity for
  // later reference (equivalent to the prototype's ActionBar saved state).
  const [saved, setSaved] = useState(false);

  if (!entry.building) return null;

  const isHero = size === "hero";

  const username = entry.user?.username ?? "Unknown User";
  const avatarUrl = entry.user?.avatar_url ?? undefined;
  const userInitial = username.charAt(0).toUpperCase();
  const mainTitle = entry.building.name;

  // Derive a readable location string from city or the last segment of address.
  const city =
    entry.building.city ||
    entry.building.address?.split(",").pop()?.trim() ||
    "";

  const cardImageSrc =
    getBuildingImageUrl(entry.building.main_image_url) ??
    getBuildingImageUrl(entry.building.community_preview_url);

  // Action copy per spec — no inline building name (that lives in the card body).
  const actionCopy =
    activityStatus === "visited" ? "visited" : "wants to visit";

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building.id) {
      navigate(
        getBuildingUrl(
          entry.building.id,
          entry.building.slug,
          entry.building.short_id,
        ),
      );
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(entry.id);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((s) => !s);
  };

  const likesCount = entry.likes_count ?? 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <article
      onClick={handleCardClick}
      className="flex flex-col w-full max-w-full min-w-0 bg-surface-card border border-border-default rounded-sm shadow-none overflow-hidden cursor-pointer hover:border-border-strong transition-colors"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      {/*
        Token refs:
          - surface-card       → card background
          - border-default     → bottom separator
          - text-primary       → username (semibold)
          - text-secondary     → action copy
          - text-disabled      → timestamp (quietest read level)
        Sizing: hero uses h-7 avatar + text-sm; compact drops to h-6 + text-xs
        to remain legible in the half-width 2-column grid cell.
      */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-border-default",
          isHero ? "p-3.5" : "p-3",
        )}
      >
        <Avatar
          className={cn(
            "border border-border-default/50 shrink-0",
            isHero ? "h-7 w-7" : "h-6 w-6",
          )}
        >
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className={isHero ? "text-2xs-plus" : "text-2xs"}>
            {userInitial}
          </AvatarFallback>
        </Avatar>

        <div
          className={cn(
            "flex-1 min-w-0 leading-tight",
            isHero ? "text-sm" : "text-xs",
          )}
        >
          <span className="font-semibold text-text-primary">{username}</span>
          <span className="text-text-secondary font-normal"> {actionCopy}</span>
        </div>

        <span
          className={cn(
            "text-text-disabled whitespace-nowrap shrink-0",
            isHero ? "text-xs" : "text-2xs",
          )}
        >
          {formatDistanceToNow(
            new Date(entry.edited_at || entry.created_at),
          ).replace("about ", "")}{" "}
          ago
        </span>
      </div>

      {/* ── Image zone ──────────────────────────────────────────────────────── */}
      {/*
        Hero path first, then community_preview_url (storage paths via getBuildingImageUrl).
        Rendered only when a resolved URL exists AND the load succeeded.
        onError collapses the zone entirely (no broken-image chrome).

        Aspect ratios per spec:
          hero    → 4/5  (portrait, matches FeedHeroCard single-image cap)
          compact → 3/4  (slightly taller portrait; correct for half-width cell)

        object-cover ensures the building photo is always full-bleed regardless
        of the source image's native aspect ratio.
      */}
      {cardImageSrc && imageVisible && (
        <div
          className={cn(
            "w-full overflow-hidden bg-surface-muted",
            isHero ? "aspect-[4/5]" : "aspect-[3/4]",
          )}
        >
          <img
            src={cardImageSrc}
            alt={mainTitle}
            className="w-full h-full object-cover"
            onError={() => setImageVisible(false)}
          />
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {/*
        Building name:
          hero    → text-lg font-semibold (card-title context per type matrix)
          compact → text-sm font-semibold (subsection-heading size for density)

        Location line: map-pin icon + city string at text-xs text-secondary.
        Icon is 12×12 (w-3 h-3) — same as the prototype's mapPin icon.

        Status badge:
          visited  → bg-brand-primary text-brand-primary-foreground
                     (neon accent — one of the two permitted uses per card;
                      DESIGN_TOKENS §10 brand restraint rule)
          pending  → bg-surface-muted border border-border-default text-text-secondary
                     (quiet muted chip — no neon; this action has not been confirmed)

        Badge typography: text-2xs-plus, font-medium, tracking-wide, uppercase, rounded-sm.
        Matches DESIGN_TOKENS §9 Badge/tag row.

        No Michelin-circle widget. This is a pure status event. (C7-1 spec.)
      */}
      <div
        className={cn(
          "flex flex-col gap-1.5",
          isHero ? "p-3.5 pb-2.5" : "p-3 pb-2",
        )}
      >
        <span
          className={cn(
            "font-semibold text-text-primary leading-tight",
            isHero ? "text-lg" : "text-sm",
          )}
        >
          {mainTitle}
        </span>

        {city && (
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
            <span className="truncate">{city}</span>
          </div>
        )}

        {/* Status badge — sits on its own line below the location row */}
        <div className="mt-0.5">
          {activityStatus === "visited" ? (
            /*
             * Visited — brand-primary (neon) background.
             * brand-primary-foreground on the neon surface (DESIGN_TOKENS §2 dark-on-neon).
             * Checkmark uses w-2.5 h-2.5.
             */
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-brand-primary text-brand-primary-foreground text-2xs-plus font-medium tracking-wide uppercase">
              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
              Visited
            </span>
          ) : (
            /*
             * Bucket list — muted surface with default border.
             * text-secondary matches the "quiet" read level; no neon here
             * (bucket-list is aspirational, not confirmed — restraint is right).
             */
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-surface-muted border border-border-default text-text-secondary text-2xs-plus font-medium tracking-wide uppercase">
              <Bookmark className="w-2.5 h-2.5" strokeWidth={1.8} />
              Bucket list
            </span>
          )}
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      {/*
        Like + Bookmark only. No comment (no thread on a status event — spec §C7-1).
        No visit/save/hide action row (actor has already acted — spec §C7-1).

        Like count: shown only when > 0, following the prototype pattern.
        Bookmark: local toggle only (saves the activity post to reading list).

        Icon sizing: h-3.5 w-3.5 (matches compact action icons in FeedHeroCard).
        Padding: px-2 py-1 on the bar; px-2 h-8 on each button — mirrors FeedHeroCard.

        Like active state: fill-brand-primary text-brand-primary (matches FeedHeroCard
        line 372–374 — the existing codebase uses brand-primary for liked hearts,
        not feedbackDestructive; we stay consistent with that decision).
      */}
      <div className="flex items-center px-2 py-1 border-t border-border-default">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          className="inline-flex items-center gap-1.5 h-8 px-2 rounded-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors text-xs font-medium"
          title={`${likesCount} likes`}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              entry.is_liked
                ? "fill-brand-primary text-brand-primary"
                : "",
            )}
            strokeWidth={1.8}
          />
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>

        <div className="flex-1" />

        {/* Bookmark */}
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center h-8 px-2 rounded-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors"
          title={saved ? "Saved" : "Save"}
        >
          <Bookmark
            className={cn(
              "h-3.5 w-3.5",
              saved ? "fill-text-primary text-text-primary" : "",
            )}
            strokeWidth={1.8}
          />
        </button>
      </div>
    </article>
  );
}