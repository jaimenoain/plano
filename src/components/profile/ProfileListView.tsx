import { useNavigate } from "react-router-dom";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getBuildingImageUrl } from "@/utils/image";
import { StatusBadge } from "./StatusBadge";
import { InlineRating } from "./InlineRating";

interface ProfileListViewProps {
  data: FeedReview[];
  isOwnProfile: boolean;
  onUpdate: (id: string, updates: { status?: string; rating?: number | null }) => void;
}

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "—";
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
      return parts[parts.length - 2];
  }
  return parts[0];
}

export function ProfileListView({ data, isOwnProfile, onUpdate }: ProfileListViewProps) {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();

  const handleRowClick = (review: FeedReview) => {
    if (review.building.id) {
      navigate(getBuildingUrl(review.building.id, review.building.slug, review.building.short_id));
    }
  };

  return (
    <div className="-mx-4 overflow-x-auto">
      <Table className="min-w-full table-fixed text-xs">
        <TableHeader>
          <TableRow className="border-b border-border/40 hover:bg-transparent h-8">
            <TableHead className="w-[70px] pl-4 text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">
              {isMobile ? "" : "Photo"}
            </TableHead>
            <TableHead className={cn(
              "text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0",
              isMobile ? "w-auto" : "w-[15%]"
            )}>Name</TableHead>
            {!isMobile && <TableHead className="w-[10%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Status</TableHead>}
            {!isMobile && <TableHead className="w-[10%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Points</TableHead>}
            {!isMobile && <TableHead className="w-[15%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Review</TableHead>}
            {!isMobile && <TableHead className="w-[15%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Architect</TableHead>}
            {!isMobile && <TableHead className="w-[10%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Year</TableHead>}
            {!isMobile && <TableHead className="w-[10%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Location</TableHead>}
            {!isMobile && <TableHead className="w-[10%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Country</TableHead>}
            {!isMobile && <TableHead className="w-[10%] pr-4 text-right text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Likes</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((review) => {
            const architectNames = review.building.architects && review.building.architects.length > 0
              ? review.building.architects.map((a) => (typeof a === 'string' ? a : a.name)).join(", ")
              : "—";

            const location = review.building.city || getCityFromAddress(review.building.address);
            const imageUrl = getBuildingImageUrl(review.building.main_image_url);

            return (
              <TableRow
                key={review.id}
                onClick={() => handleRowClick(review)}
                className={cn(
                  "cursor-pointer hover:bg-muted/30 border-b border-border/30 transition-colors group",
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
                            className="w-8 h-8 rounded-md object-cover border border-border/50"
                          />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 p-0 overflow-hidden rounded-md border-0 shadow-lg" side="right">
                        <img
                          src={imageUrl}
                          alt={review.building.name}
                          className="w-full h-auto object-cover"
                        />
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-secondary/50" />
                  )}
                </TableCell>
                <TableCell className={cn("font-medium text-foreground py-1", !isMobile && "truncate")}>
                  <div className="flex flex-col gap-1">
                    <span className="truncate">{review.building.name}</span>
                    {isMobile && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge
                          status={review.status}
                          isOwnProfile={isOwnProfile}
                          onClick={() => {
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
                        isOwnProfile={isOwnProfile}
                        onClick={() => {
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
                    <TableCell className="text-muted-foreground py-1 truncate">
                      {review.content ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block">{review.content}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-xs">
                            <p className="whitespace-normal break-words">{review.content}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground py-1 truncate">
                      {architectNames}
                    </TableCell>
                    <TableCell className="text-muted-foreground py-1">
                      {review.building.year_completed || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground py-1 truncate">
                      {location}
                    </TableCell>
                    <TableCell className="text-muted-foreground py-1 truncate">
                      {review.building.country || "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right py-1">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                            <Heart className={cn("w-3 h-3", review.is_liked && "fill-primary text-primary")} />
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
