import { Trophy, Medal, MapPin, ExternalLink } from "lucide-react";
import { useAwardLeaderboard } from "../hooks/useAwards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router";

interface AwardLeaderboardDialogProps {
  awardId?: string;
  awardName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AwardLeaderboardDialog({
  awardId,
  awardName,
  open,
  onOpenChange,
}: AwardLeaderboardDialogProps) {
  const { data: buildings, isLoading } = useAwardLeaderboard(awardId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-amber-500" />
            {awardName ? `${awardName} Leaderboard` : "Global Award Leaderboard"}
          </DialogTitle>
          <p className="text-sm text-text-secondary">
            Buildings ranked by total award wins and recognitions.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-12 w-12 rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : buildings?.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                No buildings found on this leaderboard yet.
              </div>
            ) : (
              buildings?.map((b, index) => (
                <div
                  key={b.building_id}
                  className="flex items-center gap-4 py-3 border-b border-border-default last:border-0 group"
                >
                  <div className="w-8 text-center font-bold text-text-secondary">
                    {index + 1}
                  </div>
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-surface-muted shrink-0 border border-border-default">
                    {b.hero_image_url ? (
                      <img
                        src={b.hero_image_url}
                        alt={b.building_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-text-disabled" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/building/${b.building_slug}`}
                        className="font-medium hover:text-primary transition-colors truncate"
                        onClick={() => onOpenChange(false)}
                      >
                        {b.building_name}
                      </Link>
                      {b.win_count > 0 && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 px-1.5 py-0">
                          <Medal className="h-3 w-3" />
                          {b.win_count}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary truncate flex items-center gap-1">
                      {b.city}, {b.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-text-primary">
                      {b.award_score} pts
                    </div>
                    <div className="text-2xs text-text-secondary">
                      {b.win_count} wins, {b.finalist_count} finals
                    </div>
                  </div>
                  <Link
                    to={`/building/${b.building_slug}`}
                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-primary"
                    onClick={() => onOpenChange(false)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
