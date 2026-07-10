import { useNavigate } from "react-router";
import { useSidebar } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedReview } from "@/types/feed";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { Heart } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { profileLogCardImageUrl } from "@/features/profile/utils/profileLogCardImageUrl";
import { StatusBadge } from "./StatusBadge";
import { InlineRating } from "./InlineRating";
import { InlineReviewEditor } from "./InlineReviewEditor";

interface ProfileListViewProps {
  data: FeedReview[];
  isOwnProfile: boolean;
  onUpdate: (id: string, updates: { status?: string; rating?: number | null; content?: string }) => void;
  /** When false (Hero off), thumbnails use only photos on the user’s review, not building hero/community. */
  showCommunityImages?: boolean;
}

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "—";
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
      return parts[parts.length - 2];
  }
  return parts[0];
}

export function ProfileListView({
  data,
  isOwnProfile,
  onUpdate,
  showCommunityImages = true,
}: ProfileListViewProps) {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();

  const handleRowClick = (review: FeedReview) => {
    if (review.building.id) {
      // Locality URL not available: ReviewBuilding (FeedReview) does not include locality_country_code/city_slug — requires get_feed RPC to include locality fields in building_data
      navigate(getBuildingUrl(review.building.id, review.building.slug, review.building.short_id));
    }
  };

  return (
    <div className="-mx-4 overflow-x-scroll-touch">
      <Table className="min-w-full table-fixed">
        <TableHeader>
          <TableRow className="h-10 hover:bg-transparent">
            <TableHead className="w-[70px] pl-4">
              {isMobile ? "" : "Photo"}
            </TableHead>
            <TableHead className={cn(isMobile ? "w-auto" : "w-[15%]")}>Name</TableHead>
            {!isMobile && <TableHead className="w-[10%]">Status</TableHead>}
            {!isMobile && <TableHead className="w-[10%]">Points</TableHead>}
            {!isMobile && <TableHead className="w-[15%]">Review</TableHead>}
            {!isMobile && <TableHead className="w-[15%]">Credits</TableHead>}
            {!isMobile && <TableHead className="w-[10%]">Year</TableHead>}
            {!isMobile && <TableHead className="w-[10%]">Location</TableHead>}
            {!isMobile && <TableHead className="w-[10%]">Country</TableHead>}
            {!isMobile && <TableHead className="w-[10%] pr-4 text-right">Likes</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((review) => {
            const creditNames =
              review.building.creditedEntities && review.building.creditedEntities.length > 0
                ? review.building.creditedEntities.map((c) => c.name).join(", ")
                : "—";

            const location = review.building.city || getCityFromAddress(review.building.address);
            const imageUrl = profileLogCardImageUrl(review, showCommunityImages);

            return (
              <TableRow
                key={review.id}
                onClick={() => handleRowClick(review)}
                className={cn(
                  "cursor-pointer transition-colors group",
                  isMobile ? "h-auto" : "h-8"
                )}
              >
                <TableCell className="pl-4 py-1">
                  {imageUrl ? (
                    <HoverCard openDelay={0} closeDelay={0}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center">
                          <img
                            src={imageUrl}
                            alt={review.building.name}
                            className="w-8 h-8 rounded-none object-cover border border-border-default/50"
                          />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 p-0 overflow-hidden rounded-none border-0 shadow-lg" side="right">
                        <img
                          src={imageUrl}
                          alt={review.building.name}
                          className="w-full h-auto object-cover"
                        />
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <div className="w-8 h-8 rounded-none bg-surface-muted/50" />
                  )}
                </TableCell>
                <TableCell className={cn("font-medium text-text-primary py-1", !isMobile && "truncate")}>
                  <div className="flex flex-col gap-1">
                    <span className="truncate">{review.building.name}</span>
                    {isMobile && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge
                          status={review.status}
                          isOwnProfile={isOwnProfile && review.status !== 'lost'}
                          onClick={() => {
                            if (review.status === 'lost') return;
                            const currentStatus = review.status || 'visited';
                            const newStatus = currentStatus === 'visited' ? 'pending' : 'visited';
                            onUpdate(review.id, { status: newStatus });
                          }}
                        />
                        <InlineRating
                          rating={review.rating}
                          onRate={(rating) => onUpdate(review.id, { rating })}
                          readOnly={!isOwnProfile}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
                {!isMobile && (
                  <>
                    <TableCell className="py-1">
                      <StatusBadge
                        status={review.status}
                        isOwnProfile={isOwnProfile && review.status !== 'lost'}
                        onClick={() => {
                          if (review.status === 'lost') return;
                          const currentStatus = review.status || 'visited';
                          const newStatus = currentStatus === 'visited' ? 'pending' : 'visited';
                          onUpdate(review.id, { status: newStatus });
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <InlineRating
                        rating={review.rating}
                        onRate={(rating) => onUpdate(review.id, { rating })}
                        readOnly={!isOwnProfile}
                      />
                    </TableCell>
                    <TableCell className="text-text-secondary py-1">
                      <InlineReviewEditor
                        initialContent={review.content}
                        isOwnProfile={isOwnProfile}
                        onSave={(content) => onUpdate(review.id, { content })}
                      />
                    </TableCell>
                    <TableCell className="text-text-secondary py-1 truncate">
                      {creditNames}
                    </TableCell>
                    <TableCell className="text-text-secondary py-1">
                      {review.building.year_completed || "—"}
                    </TableCell>
                    <TableCell className="text-text-secondary py-1 truncate">
                      {location}
                    </TableCell>
                    <TableCell className="text-text-secondary py-1 truncate">
                      {review.building.country || "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right py-1">
                      <div className="flex items-center justify-end gap-1 text-text-secondary">
                        <Heart className={cn("w-3 h-3", review.is_liked && "fill-brand-primary text-brand-primary")} />
                        <span>{review.likes_count}</span>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
