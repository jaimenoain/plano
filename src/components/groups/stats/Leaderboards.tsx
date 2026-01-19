import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Video, Clapperboard } from "lucide-react";

interface LeaderboardsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directors: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actors: any[];
}

export function Leaderboards({ directors, actors }: LeaderboardsProps) {
  if ((!directors || directors.length === 0) && (!actors || actors.length === 0)) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* DIRECTORS */}
      <Card className="border-none shadow-sm bg-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-pink-500" />
            Top Rated Directors
          </CardTitle>
          <p className="text-xs text-muted-foreground">Highest average rating (min 3 films)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {directors?.map((director, i) => (
            <div key={director.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground w-4 text-center">{i + 1}</span>
                <div>
                  <div className="font-semibold text-sm">{director.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                     <Video className="h-3 w-3" /> {director.count} films
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-xs font-bold">
                 <Star className="h-3 w-3 fill-current" />
                 {director.avg_rating.toFixed(1)}
              </div>
            </div>
          ))}
          {(!directors || directors.length === 0) && (
              <div className="text-center text-xs text-muted-foreground py-8 italic">
                  Not enough data yet.
              </div>
          )}
        </CardContent>
      </Card>

      {/* ACTORS */}
      <Card className="border-none shadow-sm bg-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-500" />
            Most Watched Actors
          </CardTitle>
          <p className="text-xs text-muted-foreground">Most appearances in watched films</p>
        </CardHeader>
        <CardContent className="space-y-4">
           {actors?.map((actor, i) => (
            <div key={actor.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground w-4 text-center">{i + 1}</span>
                <Avatar className="h-8 w-8 rounded-sm">
                    <AvatarFallback className="rounded-sm text-[10px] bg-muted text-muted-foreground">
                        {actor.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                    </AvatarFallback>
                </Avatar>
                <div className="font-semibold text-sm">{actor.name}</div>
              </div>
              <div className="text-sm font-mono font-medium text-muted-foreground">
                 {actor.count}
              </div>
            </div>
          ))}
           {(!actors || actors.length === 0) && (
              <div className="text-center text-xs text-muted-foreground py-8 italic">
                  Not enough data yet.
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
