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
};

export type ReviewCardCarouselImage = {
  id: string;
  url: string;
  likes_count: number;
  is_liked: boolean;
};

export type ReviewCardData = {
  username: string;
  avatarUrl: string | null;
  isVerifiedArchitect: boolean;
  isArchitectOfBuilding: boolean;
  mainTitle: string;
  subTitle: string | null | undefined;
  posterUrl: string | undefined;
  mediaItems: ReviewCardMediaItem[];
  carouselImages: ReviewCardCarouselImage[];
  hasVideo: boolean;
  city: string;
};

export function useReviewCardData(
  entry: FeedReview,
  options: {
    variant: "default" | "compact";
    showCommunityImages: boolean;
  },
): {
  data: ReviewCardData | null;
  failedImages: Set<string>;
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
} {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const data = useMemo((): ReviewCardData | null => {
    if (!entry.building) return null;

    const posterUrl = getBuildingImageUrl(entry.building.main_image_url);

    const username = entry.user?.username || "Unknown User";
    const avatarUrl = entry.user?.avatar_url ?? null;
    const isVerifiedArchitect = entry.user?.is_verified_architect || false;
    const isArchitectOfBuilding = entry.user?.is_architect_of_building || false;

    const mainTitle = entry.building.name;
    const credits = entry.building.creditedEntities;
    const year_completed = entry.building.year_completed;
    const creditNames = credits ? credits.map((c) => c.name).filter(Boolean) : [];

    let subTitle: string | null | undefined = entry.building.address;
    if (options.variant === "compact") {
      const parts: (string | number)[] = [];
      if (creditNames.length > 0) parts.push(creditNames.slice(0, 2).join(", "));
      if (year_completed) parts.push(year_completed);
      subTitle = parts.length > 0 ? parts.join(" • ") : entry.building.address;
    } else {
      const creditsList = creditNames.slice(0, 2).join(", ");
      if (creditsList) {
        subTitle = creditsList;
        if (year_completed) subTitle += ` • ${year_completed}`;
      } else if (year_completed) {
        subTitle = `${year_completed}`;
        if (entry.building.address) subTitle += ` • ${entry.building.address}`;
      }
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
            : options.showCommunityImages
              ? posterUrl || undefined
              : undefined,
      });
    }
    if (entry.images && entry.images.length > 0) {
      entry.images.forEach((img) => {
        mediaItems.push({ id: img.id, type: "image", url: img.url });
      });
    }

    const hasVideo = mediaItems.some((m) => m.type === "video");

    const carouselImages: ReviewCardCarouselImage[] = (entry.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      likes_count: img.likes_count,
      is_liked: img.is_liked,
    }));

    const city = getCityFromAddress(entry.building.address);

    return {
      username,
      avatarUrl,
      isVerifiedArchitect,
      isArchitectOfBuilding,
      mainTitle,
      subTitle,
      posterUrl,
      mediaItems,
      carouselImages,
      hasVideo,
      city,
    };
  }, [entry, options.variant, options.showCommunityImages]);

  return { data, failedImages, setFailedImages };
}
