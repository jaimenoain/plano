import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/features/profile";
import type { Person } from "../types";
import { listPersonFollowers, personFollowKeys } from "../api/personFollows";

interface PersonFollowersDialogProps {
  person: Pick<Person, "id" | "name" | "claimedByUserId">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Followers of a person — same row grammar as the profile page's follower dialog. */
export function PersonFollowersDialog({ person, open, onOpenChange }: PersonFollowersDialogProps) {
  const { data: followers, isLoading } = useQuery({
    queryKey: personFollowKeys.list(person.id, person.claimedByUserId),
    queryFn: () => listPersonFollowers(person),
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Followers</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !followers || followers.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">No followers yet.</p>
          ) : (
            <div className="space-y-1 py-1">
              {followers.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 px-1 py-1.5">
                  <Link
                    to={`/profile/${f.username}`}
                    className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-70"
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={f.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {f.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-text-primary">
                      {f.username}
                    </span>
                  </Link>
                  <FollowButton userId={f.id} className="h-7 px-3 text-2xs" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
