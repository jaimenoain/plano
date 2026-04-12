import { useMemo, useState } from "react";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0];
}

export type ReviewCardMediaItem = {
  id: string;
  type: "video" | "image";
  url: string;
  poster?: string;
  /** Present for stills from `entry.images`; used by carousels for like state. */
  likes_count?: number;
  is_liked?: boolean;
};

export type ReviewCardData = {
  username: string;
  avatarUrl: string | null;
  isVerifiedArchitect: boolean;
  isArchitectOfBuilding: boolean;
  mainTitle: string;
  subTitle: string | null | undefined;
  mediaItems: ReviewCardMediaItem[];
  hasVideo: boolean;
  city: string;
};

export function useReviewCardData(
  entry: FeedReview,
): {
  data: ReviewCardData | null;
  failedImages: Set<string>;
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
} {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const data = useMemo((): ReviewCardData | null => {
    if (!entry.building) return null;

    /** Building hero only — used as video poster fallback; community preview is not mixed in. */
    const buildingPosterFallback = getBuildingImageUrl(entry.building.main_image_url);

    const username = entry.user?.username || "Unknown User";
    const avatarUrl = entry.user?.avatar_url ?? null;
    const isVerifiedArchitect = entry.user?.is_verified_architect || false;
    const isArchitectOfBuilding = entry.user?.is_architect_of_building || false;

    const mainTitle = entry.building.name;
    const credits = entry.building.creditedEntities;
    const year_completed = entry.building.year_completed;
    const creditNames = credits ? credits.map((c) => c.name).filter(Boolean) : [];

    let subTitle: string | null | undefined = entry.building.address;
    const creditsList = creditNames.slice(0, 2).join(", ");
    if (creditsList) {
      subTitle = creditsList;
      if (year_completed) subTitle += ` • ${year_completed}`;
    } else if (year_completed) {
      subTitle = `${year_completed}`;
      if (entry.building.address) subTitle += ` • ${entry.building.address}`;
    }

    const mediaItems: ReviewCardMediaItem[] = [];
    if (entry.video_url) {
      mediaItems.push({
        id: `video-${entry.id}`,
        type: "video",
        url: entry.video_url,
        poster:
          entry.images && entry.images.length > 0
            ? entry.images[0].url
            : buildingPosterFallback || undefined,
      });
    }
    if (entry.images && entry.images.length > 0) {
      entry.images.forEach((img) => {
        mediaItems.push({
          id: img.id,
          type: "image",
          url: img.url,
          likes_count: img.likes_count,
          is_liked: img.is_liked,
        });
      });
    }

    const hasVideo = mediaItems.some((m) => m.type === "video");

    const city = getCityFromAddress(entry.building.address);

    return {
      username,
      avatarUrl,
      isVerifiedArchitect,
      isArchitectOfBuilding,
      mainTitle,
      subTitle,
      mediaItems,
      hasVideo,
      city,
    };
  }, [entry]);

  return { data, failedImages, setFailedImages };
}
