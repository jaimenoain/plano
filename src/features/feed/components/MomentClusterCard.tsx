import { useState } from "react";
import { useNavigate } from "react-router";
import { getBuildingImageUrl } from "@/utils/image";
import { CardAttribution } from "./card-parts/CardAttribution";
import type { FeedItemMomentCluster, ClusterPost } from "@/types/feedItem";

interface MomentClusterCardProps {
  item: FeedItemMomentCluster;
}

function ClusterThumbnail({ post }: { post: ClusterPost }) {
  const imgUrl = post.imageStoragePath ? getBuildingImageUrl(post.imageStoragePath) : null;
  return (
    <div className="relative overflow-hidden aspect-square bg-surface-muted rounded-sm">
      {imgUrl && (
        <img
          src={imgUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[11px] font-medium text-white leading-tight truncate">
        {post.buildingName}
      </p>
    </div>
  );
}

/**
 * Renders a moment cluster — multiple related ring-1 posts collapsed into one
 * card. Shows a large hero from the lead post, actor facepile, and a row of
 * supporting thumbnails. Tapping a thumbnail navigates to the building page.
 *
 * Inline expansion: tapping "Show all" reveals the full list of supporting posts
 * without navigating away, keeping friction low.
 */
export function MomentClusterCard({ item }: MomentClusterCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { leadPost, supportingPosts, actors, buildingOrLocality, attribution } = item;
  const heroUrl = leadPost.imageStoragePath
    ? getBuildingImageUrl(leadPost.imageStoragePath)
    : buildingOrLocality.kind === "building"
      ? getBuildingImageUrl(buildingOrLocality.mainImageUrl ?? "")
      : buildingOrLocality.mainImageUrl
        ? getBuildingImageUrl(buildingOrLocality.mainImageUrl)
        : null;

  const allSupportingPosts = supportingPosts;
  const visibleThumbnails = expanded ? allSupportingPosts : allSupportingPosts.slice(0, 3);
  const hiddenCount = allSupportingPosts.length - 3;

  const handleBuildingClick = (buildingId: string) => {
    navigate(`/buildings/${buildingId}`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface-card overflow-hidden">
      {/* Hero image */}
      {heroUrl && (
        <div
          className="relative flex-1 min-h-0 overflow-hidden cursor-pointer"
          onClick={() => handleBuildingClick(leadPost.buildingId)}
        >
          <img
            src={heroUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Attribution + headline over hero */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <CardAttribution
              kind={attribution.kind}
              text={attribution.text}
              className="text-white/70 mb-1"
            />
            <h3 className="font-sans font-bold tracking-tight text-white text-lg leading-tight line-clamp-2">
              {buildingOrLocality.kind === "locality"
                ? (buildingOrLocality.city ?? "This area")
                : buildingOrLocality.buildingName}
            </h3>
          </div>
        </div>
      )}

      {/* Actor facepile */}
      {actors.length > 0 && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="flex -space-x-2 shrink-0">
            {actors.slice(0, 3).map((actor) => (
              <div
                key={actor.id}
                className="h-6 w-6 rounded-full border-2 border-surface-card bg-surface-muted overflow-hidden"
                title={actor.username}
              >
                {actor.avatarUrl ? (
                  <img
                    src={actor.avatarUrl}
                    alt={actor.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-[10px] text-text-secondary">
                    {actor.username[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-text-secondary font-medium truncate">
            {actors.length === 1
              ? actors[0].username
              : actors.length === 2
                ? `${actors[0].username}, ${actors[1].username}`
                : `${actors[0].username} and ${actors.length - 1} others`}
          </span>
        </div>
      )}

      {/* Supporting thumbnails */}
      {visibleThumbnails.length > 0 && (
        <div className="grid grid-cols-3 gap-[2px] px-4 pt-2 pb-3">
          {visibleThumbnails.map((post) => (
            <div
              key={post.id}
              className="cursor-pointer"
              onClick={() => handleBuildingClick(post.buildingId)}
            >
              <ClusterThumbnail post={post} />
            </div>
          ))}
        </div>
      )}

      {/* Expand / collapse toggle */}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mx-4 mb-3 text-xs text-text-secondary underline underline-offset-2 text-left hover:text-text-primary transition-colors"
        >
          Show {hiddenCount} more
        </button>
      )}
      {expanded && allSupportingPosts.length > 3 && (
        <button
          onClick={() => setExpanded(false)}
          className="mx-4 mb-3 text-xs text-text-secondary underline underline-offset-2 text-left hover:text-text-primary transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}
