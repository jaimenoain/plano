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
import { PlanoLogo } from "@/components/common/PlanoLogo";

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
          <PlanoLogo className="h-32 w-auto mb-6" />
          
          <div className="space-y-4">
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
                  Join <span className="font-semibold text-foreground">{inviter.username}</span> and others to explore architecture.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-lg leading-relaxed max-w-[300px] mx-auto">
                Discover buildings, share reviews, and connect with architecture enthusiasts.
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
  building: {
    id: string;
    name: string;
    main_image_url: string | null;
    address?: string | null;
    architects?: string[] | null;
    year_completed?: number | null;
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

      // Use optimized RPC to fetch feed with all necessary data in one request
      const { data, error } = await supabase
        .rpc("get_feed", {
          p_limit: PAGE_SIZE,
          p_offset: from
        });

      if (error) throw error;

      return (data || []).map((review: any) => ({
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
          username: review.user_data?.username || null,
          avatar_url: review.user_data?.avatar_url || null,
        },
        building: {
          id: review.building_data?.id,
          name: review.building_data?.name || "Unknown Building",
          main_image_url: review.building_data?.main_image_url || null,
          address: review.building_data?.address || null,
          architects: review.building_data?.architects || null,
          year_completed: review.building_data?.year_completed || null,
        },
        likes_count: review.likes_count || 0,
        comments_count: review.comments_count || 0,
        is_liked: review.is_liked,
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
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-2 md:px-6 pt-6 md:pt-8 pb-24 mx-auto w-full">
          {reviews.length === 0 ? (
            <EmptyFeed />
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Feed Column */}
              <div className="w-full lg:w-2/3 flex flex-col gap-6">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    entry={review}
                    onLike={handleLike}
                  />
                ))}

                {hasNextPage && (
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

              {/* Sidebar Column */}
              <div className="hidden lg:block lg:w-1/3 sticky top-20">
                 <div className="space-y-4">
                    <div className="p-5 border rounded-xl bg-card shadow-sm">
                       <h3 className="font-semibold mb-2">Trending</h3>
                       <p className="text-sm text-muted-foreground">
                         Discover popular buildings and active discussions in the community.
                         <br/><br/>
                         (Coming soon)
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
