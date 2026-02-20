import { useNavigate } from "react-router-dom";
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
import { getBuildingImageUrl } from "@/utils/image";

interface ProfileListViewProps {
  data: FeedReview[];
}

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "—";
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
      return parts[parts.length - 2];
  }
  return parts[0];
}

export function ProfileListView({ data }: ProfileListViewProps) {
  const navigate = useNavigate();

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
            <TableHead className="w-[50px] pl-4 text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Photo</TableHead>
            <TableHead className="w-[20%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Name</TableHead>
            <TableHead className="w-[20%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Architect</TableHead>
            <TableHead className="w-[10%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Year</TableHead>
            <TableHead className="w-[15%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Location</TableHead>
            <TableHead className="w-[15%] text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Country</TableHead>
            <TableHead className="w-[15%] pr-4 text-right text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-8 py-0">Likes</TableHead>
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
                className="cursor-pointer hover:bg-muted/30 border-b border-border/30 transition-colors group h-8"
              >
                <TableCell className="pl-4 py-1">
                  {imageUrl ? (
                    <HoverCard openDelay={0} closeDelay={0}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center">
                          <img
                            src={imageUrl}
                            alt={review.building.name}
                            className="w-8 h-8 rounded-full object-cover border border-border/50"
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
                    <div className="w-8 h-8 rounded-full bg-secondary/50" />
                  )}
                </TableCell>
                <TableCell className="font-medium text-foreground py-1 truncate">
                  {review.building.name}
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
