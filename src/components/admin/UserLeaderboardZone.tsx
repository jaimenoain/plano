import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeaderboardUser } from "@/types/admin";
import { formatDistanceToNow } from "date-fns";

type UserLeaderboardZoneProps = {
  data: {
    most_reviews: LeaderboardUser[];
    most_ratings: LeaderboardUser[];
    most_likes: LeaderboardUser[];
    most_comments: LeaderboardUser[];
    most_votes: LeaderboardUser[];
    most_groups_joined: LeaderboardUser[];
    most_recently_online: LeaderboardUser[];
    most_follows_given: LeaderboardUser[];
    most_followers_gained: LeaderboardUser[];
    most_sessions: LeaderboardUser[];
  };
};

export function UserLeaderboardZone({ data }: UserLeaderboardZoneProps) {
  const categories = [
    { title: "Most Reviews", data: data.most_reviews, metric: "reviews" },
    { title: "Most Ratings", data: data.most_ratings, metric: "ratings" },
    { title: "Most Likes", data: data.most_likes, metric: "likes" },
    { title: "Most Comments", data: data.most_comments, metric: "comments" },
    { title: "Most Votes", data: data.most_votes, metric: "votes" },
    { title: "Groups Joined", data: data.most_groups_joined, metric: "groups" },
    { title: "Recently Online", data: data.most_recently_online, metric: "time" },
    { title: "Most Follows", data: data.most_follows_given, metric: "follows" },
    { title: "Most Followers", data: data.most_followers_gained, metric: "followers" },
    { title: "Most Sessions", data: data.most_sessions, metric: "visits" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {categories.map((category) => (
        <Card key={category.title} className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {category.title}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                (30d)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-4">
                {category.data.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity recorded.</p>
                ) : (
                  category.data.map((user, index) => (
                    <div key={user.user_id} className="flex items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="h-8 w-8 border">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.username || "User"} />
                            <AvatarFallback>{user.username?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-sm ring-1 ring-background">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {user.username || "Anonymous"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium tabular-nums">
                          {category.metric === "time"
                            ? user.last_online
                              ? formatDistanceToNow(new Date(user.last_online), { addSuffix: true })
                              : "N/A"
                            : user.count}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
