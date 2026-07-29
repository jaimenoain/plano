import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  followPerson,
  getPersonFollowState,
  personFollowKeys,
  unfollowPerson,
} from "../api/personFollows";

interface FollowPersonButtonProps {
  personId: string;
  personName: string;
  className?: string;
}

/**
 * Follow control for an UNCLAIMED person — same visual grammar as the user
 * `FollowButton`. Claimed people render the user FollowButton instead
 * (following the person IS following the claimant), and `claim_person`
 * converts these rows on claim, so this component never sees a claimed row.
 */
export function FollowPersonButton({ personId, personName, className }: FollowPersonButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const { data: isFollowing = false } = useQuery({
    queryKey: personFollowKeys.state(personId, user?.id ?? ""),
    queryFn: () => getPersonFollowState(personId, user!.id),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  if (!user) return null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowPerson(personId, user.id);
        toast({ title: `Unfollowed ${personName}` });
      } else {
        await followPerson(personId, user.id);
        toast({ title: `Following ${personName}` });
      }
      queryClient.setQueryData(personFollowKeys.state(personId, user.id), !isFollowing);
      // Prefix invalidation — matches all claim-state variants of the key.
      void queryClient.invalidateQueries({ queryKey: ["person-follower-count", personId] });
      void queryClient.invalidateQueries({ queryKey: ["person-followers", personId] });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "rounded-sm uppercase tracking-[0.15em] text-xs font-medium border-border-default",
        isFollowing && "bg-surface-muted",
        className,
      )}
      onClick={handleToggle}
      disabled={isLoading}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isFollowing ? (
        <>
          <UserCheck className="mr-2 h-4 w-4" />
          <span className={isHovering ? "text-feedback-destructive" : undefined}>
            {isHovering ? "Unfollow" : "Following"}
          </span>
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
