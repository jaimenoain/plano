import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedReview } from "@/types/feed";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { Circle, Heart, Image as ImageIcon } from "lucide-react";

interface ProfileListViewProps {
  data: FeedReview[];
}

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "-";
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
      <Table className="min-w-full table-fixed">
        <TableHeader>
          <TableRow className="border-b border-border/40 hover:bg-transparent">
            <TableHead className="w-[20%] pl-4 text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Name</TableHead>
            <TableHead className="w-[15%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Architect</TableHead>
            <TableHead className="w-[8%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Year</TableHead>
            <TableHead className="w-[12%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Location</TableHead>
            <TableHead className="w-[10%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Country</TableHead>
            <TableHead className="w-[8%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Status</TableHead>
            <TableHead className="w-[10%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Rating</TableHead>
            <TableHead className="w-[15%] text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Review</TableHead>
            <TableHead className="w-[5%] text-center text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Photos</TableHead>
            <TableHead className="w-[5%] pr-4 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider h-10">Likes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((review) => {
            const architectNames = review.building.architects
              ? review.building.architects.map((a: any) => (typeof a === 'string' ? a : a.name)).join(", ")
              : "-";

            const location = review.building.city || getCityFromAddress(review.building.address);

            return (
              <TableRow
                key={review.id}
                onClick={() => handleRowClick(review)}
                className="cursor-pointer hover:bg-muted/30 border-b border-border/30 transition-colors group h-12"
              >
                <TableCell className="pl-4 font-medium text-foreground py-2 truncate text-sm">
                  {review.building.name}
                </TableCell>
                <TableCell className="text-muted-foreground py-2 truncate text-sm">
                  {architectNames}
                </TableCell>
                <TableCell className="text-muted-foreground py-2 text-sm">
                  {review.building.year_completed || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground py-2 truncate text-sm">
                  {location}
                </TableCell>
                <TableCell className="text-muted-foreground py-2 truncate text-sm">
                  {review.building.country || "-"}
                </TableCell>
                <TableCell className="py-2 text-sm">
                    <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
                        review.status === 'visited'
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground"
                    )}>
                        {review.status || "-"}
                    </span>
                </TableCell>
                <TableCell className="py-2">
                  {review.rating ? (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Circle
                          key={i}
                          className={cn(
                            "w-2.5 h-2.5",
                            i < review.rating!
                              ? "fill-foreground text-foreground"
                              : "fill-transparent text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground py-2 max-w-[200px]">
                  <p className="truncate text-xs">{review.content || "-"}</p>
                </TableCell>
                <TableCell className="text-center py-2">
                  {review.images && review.images.length > 0 ? (
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{review.images.length}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right py-2">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground text-xs">
                        <Heart className={cn("w-3.5 h-3.5", review.is_liked && "fill-primary text-primary")} />
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
