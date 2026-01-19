import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { EmptyFeed } from "@/components/feed/EmptyFeed";
import { useAuth } from "@/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useInfiniteQuery, useQueryClient, InfiniteData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetaHead } from "@/components/common/MetaHead";

// --- New Landing Page Component ---
function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitedBy = searchParams.get("invited_by");
  
  const [inviter, setInviter] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [facebundle, setFacebundle] = useState<any[]>([]);

  useEffect(() => {
    async function loadInviterInfo() {
      if (!invitedBy) return;

      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("username", invitedBy)
        .single();

      if (inviterProfile) {
        setInviter(inviterProfile);

        const { data: profiles } = await supabase
          .rpc("get_inviter_facepile", {
            inviter_id: inviterProfile.id
          });

        if (profiles) setFacebundle(profiles);
      }
    }

    loadInviterInfo();
  }, [invitedBy]);

  const handleGetStarted = () => {
    const search = invitedBy ? `?invited_by=${invitedBy}` : "";
    navigate(`/auth${search}`);
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-full max-w-md space-y-12">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="p-6 rounded-full bg-primary/10 ring-1 ring-primary/20 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.3)]">
            <img src="/logo.png" alt="Cineforum" className="h-20 w-20" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Cineforum
            </h1>
            
            {inviter ? (
              <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-center pl-3">
                  {facebundle.map((person, i) => (
                    <Avatar key={i} className="h-10 w-10 border-2 border-background -ml-3 ring-2 ring-background">
                      <AvatarImage src={person.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">{person.username?.[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  <Avatar className="h-14 w-14 border-2 border-background -ml-3 z-10 shadow-lg ring-2 ring-background">
                    <AvatarImage src={inviter.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-lg">{inviter.username?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-[300px] mx-auto">
                  Join <span className="font-semibold text-foreground">{inviter.username}</span> and others to track films and share reviews.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-lg leading-relaxed max-w-[300px] mx-auto">
                Track your films, share reviews, and connect with other cinephiles.
              </p>
            )}
          </div>
        </div>

        {/* Action Button - Large touch target for all ages */}
        <div className="space-y-6">
          <Button 
            size="lg" 
            className="w-full h-16 text-xl font-semibold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" 
            onClick={handleGetStarted}
          >
            {inviter ? "Accept Invitation" : "Get Started"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Join the community today
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main Index Component ---

interface FeedReview {
  id: string;
  content: string | null;
  rating: number | null;
  tags?: string[] | null;
  created_at: string;
  edited_at?: string | null;
  status: string;
  user_id: string;
  group_id?: string | null;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  film: {
    id: string | number;
    title: string;
    original_title?: string | null;
    poster_path: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

const PAGE_SIZE = 36;

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showGroupActivity, setShowGroupActivity] = useState(true);
  const { containerRef: loadMoreRef, isVisible: isLoadMoreVisible } = useIntersectionObserver({
    rootMargin: "200px",
  });

  useEffect(() => {
    if (location.state?.reviewPosted) {
      setShowGroupActivity(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (user && !authLoading) {
      if (!user.user_metadata?.onboarding_completed) {
        navigate("/onboarding");
      }
    }
  }, [user, authLoading, navigate]);

  // Fetch following list to distinguish friend activity from pure group activity
  const { data: followingIds = [], isLoading: isFollowingLoading } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      return data?.map(d => d.following_id) || [];
    },
    enabled: !!user,
  });

  // "Peek" query to check if we should show the toggle
  const { data: canToggleGroupActivity = false } = useQuery({
    queryKey: ['feed-toggle-check', user?.id, followingIds.length],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .rpc("get_main_feed", {
          p_limit: 20,
          p_offset: 0,
          p_show_group_activity: true
        })
        .select('user_id, group_id');

      if (!data) return false;

      const pureGroupCount = data.filter((item: any) => {
        if (!item.group_id) return false;
        if (item.user_id === user.id) return false;
        if (followingIds.includes(item.user_id)) return false;
        return true;
      }).length;

      return pureGroupCount > 2;
    },
    enabled: !!user && !isFollowingLoading,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ["feed", user?.id, showGroupActivity],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const from = pageParam * PAGE_SIZE;

      // Pass showGroupActivity state to server
      const { data: reviewsData, error: reviewsError } = await supabase
        .rpc("get_main_feed", {
          p_limit: PAGE_SIZE,
          p_offset: from,
          p_show_group_activity: showGroupActivity
        })
        .select(`
          id,
          content,
          rating,
          tags,
          created_at,
          edited_at,
          status,
          user_id,
          group_id,
          film_id,
          user:profiles(id, username, avatar_url),
          film:films(id, title, original_title, poster_path),
          likes:likes(interaction_id),
          comments:comments(count),
          user_likes:likes(interaction_id)
        `)
        .eq("user_likes.user_id", user.id);

      if (reviewsError) throw reviewsError;

      return (reviewsData || []).map((review: any) => ({
        id: review.id,
        content: review.content,
        rating: review.rating,
        tags: review.tags,
        created_at: review.created_at,
        edited_at: review.edited_at,
        status: review.status,
        user_id: review.user_id,
        group_id: review.group_id,
        user: {
          username: review.user?.username || null,
          avatar_url: review.user?.avatar_url || null,
        },
        film: {
          id: review.film?.id,
          title: review.film?.title || "Unknown Film",
          original_title: review.film?.original_title,
          poster_path: review.film?.poster_path || null,
        },
        likes_count: review.likes?.length || 0,
        comments_count: review.comments?.[0]?.count || 0,
        is_liked: (review.user_likes?.length || 0) > 0,
      }));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (isLoadMoreVisible && hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [isLoadMoreVisible, hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  const reviews = data?.pages.flatMap((page) => page) || [];

  const handleLike = async (reviewId: string) => {
    if (!user) return;

    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    queryClient.setQueryData<InfiniteData<FeedReview[]>>(["feed", user.id, showGroupActivity], (oldData) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  is_liked: !r.is_liked,
                  likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1,
                }
              : r
          )
        ),
      };
    });

    try {
      if (review.is_liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("interaction_id", reviewId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ interaction_id: reviewId, user_id: user.id });
      }
    } catch (error) {
      queryClient.setQueryData<InfiniteData<FeedReview[]>>(["feed", user.id, showGroupActivity], (oldData) => {
        if (!oldData) return undefined;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    is_liked: review.is_liked,
                    likes_count: review.likes_count, // revert
                  }
                : r
            )
          ),
        };
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <AppLayout>
      <MetaHead title="Home" />
      {isLoading || isFollowingLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        /* Updated Grid for slicker mobile layout with vertical spacing */
        <div className="flex flex-col gap-6 px-2 md:px-6 pt-6 md:pt-8 pb-24 max-w-7xl mx-auto">

          {canToggleGroupActivity && (
            <div className="flex items-center justify-end">
              <Button
                variant="link"
                className="text-muted-foreground hover:text-foreground p-0 h-auto font-normal"
                onClick={() => setShowGroupActivity(!showGroupActivity)}
              >
                {showGroupActivity ? "Hide Group Activity" : "Show Group Activity"}
              </Button>
            </div>
          )}

          {reviews.length === 0 ? (
            <EmptyFeed />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onLike={handleLike}
                />
              ))}
            </div>
          )}

          {hasNextPage && reviews.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center mt-4 py-8">
               {isFetchingNextPage ? (
                 <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
               ) : isError ? (
                 <Button
                   variant="ghost"
                   onClick={() => fetchNextPage()}
                   className="text-muted-foreground hover:text-foreground"
                 >
                   Error loading more. Click to retry.
                 </Button>
               ) : (
                 <Button
                   variant="ghost"
                   onClick={() => fetchNextPage()}
                   className="text-muted-foreground hover:text-foreground"
                 >
                   Load More
                 </Button>
               )}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
