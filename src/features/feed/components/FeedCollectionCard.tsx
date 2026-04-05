import { Heart, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FeedCollection } from "@/types/feed";

// ─── Props ────────────────────────────────────────────────────────────────────
// Cursor must not change this interface.

interface FeedCollectionCardProps {
  collection: FeedCollection;
}

// ─── Mosaic cell ──────────────────────────────────────────────────────────────
// Renders a single 2×2 grid slot. When a building is supplied its main_image_url
// is loaded with object-cover. On load error the image is hidden; the parent
// cell's bg-surface-muted shows through as a graceful fallback. Slots beyond
// the previewBuildings array length receive no <img> at all — they are pure
// muted-surface fills, per the design spec.

interface MosaicCellProps {
  mainImageUrl: string | null | undefined;
}

function MosaicCell({ mainImageUrl }: MosaicCellProps) {
  const [errored, setErrored] = useState(false);

  if (!mainImageUrl || errored) {
    return <div className="w-full h-full bg-surface-muted" />;
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-surface-muted">
      <img
        src={mainImageUrl}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function FeedCollectionCard({ collection }: FeedCollectionCardProps) {
  const navigate = useNavigate();

  // Local optimistic state — mirrors the prototype's CollectionCard pattern.
  // No onLike prop per the locked interface; the parent (P7-3) wires persistence
  // at the feed-aggregation layer if needed.
  const [isLiked, setIsLiked] = useState(collection.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(collection.likes_count ?? 0);
  const [isSaved, setIsSaved] = useState(false);

  const username = collection.owner?.username ?? "unknown";
  const avatarUrl = collection.owner?.avatar_url ?? undefined;
  const userInitial = username.charAt(0).toUpperCase();

  // ── Navigation ───────────────────────────────────────────────────────────────
  // Same button-click guard as FeedHeroCard — prevents card nav on action clicks.
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    navigate(`/${username}/list/${collection.slug}`);
  };

  // ── Action handlers ───────────────────────────────────────────────────────────
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked((prev) => {
      const next = !prev;
      setLikesCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved((prev) => !prev);
  };

  // ── Mosaic slots ──────────────────────────────────────────────────────────────
  // Always produce exactly 4 slots. Slots beyond previewBuildings.length receive
  // null (rendered as bg-surface-muted fills, per spec).
  const slots = Array.from({ length: 4 }).map(
    (_, i) => collection.previewBuildings?.[i]?.main_image_url ?? null
  );

  // ── Timestamp ─────────────────────────────────────────────────────────────────
  const timestamp = collection.updated_at
    ? formatDistanceToNow(new Date(collection.updated_at)).replace("about ", "") + " ago"
    : "";

  // ── First tag (optional Badge) ────────────────────────────────────────────────
  const primaryTag = collection.tags?.[0] ?? null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <article
      onClick={handleCardClick}
      className={cn(
        // Layout & surface — matches FeedHeroCard card shell exactly
        "group relative flex flex-col w-full max-w-full min-w-0",
        "bg-surface-card border border-border-default rounded-sm shadow-none",
        "overflow-hidden cursor-pointer",
        "hover:border-border-strong transition-colors"
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {/* Mirrors FeedHeroCard header spacing: px-[14px] py-[9px] matches
          CardHeader in PlanoFeed.jsx (padding: "9px 14px"). */}
      <div className="flex items-center gap-[9px] px-[14px] py-[9px] border-b border-border-default">
        <Avatar className="h-7 w-7 shrink-0 border border-border-default/50">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[10px] font-medium text-text-secondary bg-surface-muted">
            {userInitial}
          </AvatarFallback>
        </Avatar>

        {/* Username + action copy */}
        <div className="flex-1 min-w-0 text-xs text-text-secondary leading-[1.35]">
          <span className="font-semibold text-text-primary">{username}</span>
          {" "}updated a collection
        </div>

        {/* Timestamp — right-aligned, disabled tone */}
        <span className="text-[11px] text-text-disabled whitespace-nowrap shrink-0">
          {timestamp}
        </span>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {/* Horizontal flex: 168 px mosaic | flex-1 metadata panel */}
      <div className="flex min-h-0">

        {/* Left: 2×2 photo mosaic — 168×168 px, 1.5 px gap, zero card borders */}
        {/* Grid cells are square: (168 − 1.5) ÷ 2 = 83.25 px per axis */}
        <div
          className="grid grid-cols-2 grid-rows-2 shrink-0"
          style={{
            width: 168,
            height: 168,
            gap: 1.5,
          }}
        >
          {slots.map((url, i) => (
            <MosaicCell key={i} mainImageUrl={url} />
          ))}
        </div>

        {/* Right: collection metadata — vertically centred, left-aligned */}
        {/* padding: "16px 16px 14px" from PlanoFeed prototype */}
        <div className="flex flex-col justify-center gap-2 px-4 pt-4 pb-[14px] flex-1 min-w-0">

          {/* Collection name — text-base font-semibold, per C7-2 spec */}
          <p className="text-base font-semibold text-text-primary leading-tight truncate">
            {collection.name}
          </p>

          {/* Building count + visibility — text-sm text-text-secondary */}
          <p className="text-sm text-text-secondary">
            {collection.building_count ?? 0} buildings · Public
          </p>

          {/* Optional description — truncated to 2 lines */}
          {collection.description && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-normal">
              {collection.description}
            </p>
          )}

          {/* Optional tag Badge — variant="outline" + bg-surface-muted per spec */}
          {/* Typography: xs, font-medium, tracking-wide, uppercase — Badge/tag row */}
          {primaryTag && (
            <Badge
              variant="outline"
              className={cn(
                "self-start",
                "rounded-sm px-2 py-0.5",
                "bg-surface-muted border-border-default",
                "text-[11px] font-medium tracking-wide uppercase text-text-secondary"
              )}
            >
              {primaryTag}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────────── */}
      {/* Like (with count) + bookmark only. No comment button — no thread on a
          collection update. No status/save/hide row — per C7-2 spec. */}
      {/* padding: "2px 6px" from PlanoFeed ActionBar */}
      <div className="flex items-center px-[6px] py-[2px] border-t border-border-default">

        {/* Like button with count */}
        <button
          type="button"
          onClick={handleLike}
          className={cn(
            "inline-flex items-center gap-[5px]",
            "h-8 px-2 rounded-sm",
            "text-xs font-medium",
            "text-text-secondary",
            "hover:bg-surface-muted",
            isLiked ? "hover:text-feedback-destructive" : "hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
            "transition-colors"
          )}
          title={`${likesCount} likes`}
        >
          <Heart
            className={cn(
              "h-[15px] w-[15px]",
              isLiked
                ? "fill-feedback-destructive text-feedback-destructive"
                : "text-text-secondary"
            )}
          />
          {likesCount > 0 && (
            <span className={cn(isLiked ? "text-feedback-destructive" : "")}>
              {likesCount}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save / bookmark button */}
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            "inline-flex items-center justify-center",
            "h-8 w-8 rounded-sm",
            "text-text-secondary",
            "hover:bg-surface-muted hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
            "transition-colors"
          )}
          title={isSaved ? "Saved" : "Save collection"}
        >
          <Bookmark
            className={cn(
              "h-[15px] w-[15px]",
              isSaved ? "fill-brand-primary text-brand-primary" : ""
            )}
          />
        </button>
      </div>
    </article>
  );
}