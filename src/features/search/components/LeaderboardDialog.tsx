import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { LeaderboardCard } from "./LeaderboardCard";
import { Trophy, TrendingUp, Loader2 } from "lucide-react";

interface LeaderboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaderboardDialog({ open, onOpenChange }: LeaderboardDialogProps) {
  const { leaderboard, isLoading } = useLeaderboard();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Building Leaderboards
          </DialogTitle>
          <DialogDescription>
            Discover the most popular and highly rated buildings in our community.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="most_visited" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger value="most_visited" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Most Visited
              </TabsTrigger>
              <TabsTrigger value="top_rated" className="gap-2">
                <Trophy className="h-4 w-4" />
                Top Rated
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <TabsContent value="most_visited" className="mt-0 space-y-1 pb-4">
                {leaderboard?.most_visited?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No stats available yet.
                  </div>
                ) : (
                  leaderboard?.most_visited?.map((building, index) => (
                    <LeaderboardCard
                      key={building.id}
                      building={building}
                      rank={index + 1}
                      type="visited"
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="top_rated" className="mt-0 space-y-1 pb-4">
                {leaderboard?.top_rated?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No rated buildings yet (min. 3 votes required).
                  </div>
                ) : (
                  leaderboard?.top_rated?.map((building, index) => (
                    <LeaderboardCard
                      key={building.id}
                      building={building}
                      rank={index + 1}
                      type="rated"
                    />
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
