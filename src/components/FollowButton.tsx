import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  isFollower?: boolean;
  className?: string;
}

export function FollowButton({ userId, initialIsFollowing, isFollower, className }: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialIsFollowing !== undefined || !user) return;

    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .maybeSingle();

        setIsFollowing(!!data);
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    };

    checkStatus();
  }, [userId, user, initialIsFollowing]);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (user.id === userId) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        if (error) throw error;
        setIsFollowing(false);
        toast({ title: "Unfollowed user" });
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        setIsFollowing(true);

        // Notify the user being followed
        await supabase.from("notifications").insert({
          actor_id: user.id,
          user_id: userId,
          type: "follow",
          is_read: false,
        });

        toast({ title: "Following user" });

        // Trigger PWA interaction check on successful follow
        window.dispatchEvent(new CustomEvent('pwa-interaction'));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.id === userId) return null;

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size="sm"
      className={className}
      onClick={handleToggleFollow}
      disabled={isLoading}
    >
      {isFollowing ? (
        <>
          <UserCheck className="mr-2 h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          {isFollower ? "Follow Back" : "Follow"}
        </>
      )}
    </Button>
  );
}
