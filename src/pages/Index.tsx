import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { EmptyFeed } from "@/components/feed/EmptyFeed";
import { PeopleYouMayKnow } from "@/components/feed/PeopleYouMayKnow";
import { useAuth } from "@/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useInfiniteQuery, useQueryClient, InfiniteData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetaHead } from "@/components/common/MetaHead";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { FeedReview } from "@/types/feed";

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

      const feedData = data || [];
      const reviewIds = feedData.map((r: any) => r.id);

      // Fetch review images
      const { data: imagesData } = await supabase
        .from('review_images')
        .select('id, review_id, storage_path, likes_count')
        .in('review_id', reviewIds);

      // Fetch user likes for these images
      let likedImageIds: string[] = [];
      if (imagesData && imagesData.length > 0) {
        const imageIds = imagesData.map(img => img.id);
        const { data: likesData } = await supabase
          .from('image_likes')
          .select('image_id')
          .eq('user_id', user.id)
          .in('image_id', imageIds);

        if (likesData) {
            likedImageIds = likesData.map(l => l.image_id);
        }
      }

      // Map images by review_id
      const imagesByReviewId = (imagesData || []).reduce((acc: any, img) => {
         if (!acc[img.review_id]) acc[img.review_id] = [];
         const { data: { publicUrl } } = supabase.storage.from('review_images').getPublicUrl(img.storage_path);
         acc[img.review_id].push({
             id: img.id,
             url: publicUrl,
             likes_count: img.likes_count || 0,
             is_liked: likedImageIds.includes(img.id)
         });
         return acc;
      }, {});

      return feedData.map((review: any) => ({
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
        images: imagesByReviewId[review.id] || [],
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

  const handleImageLike = async (reviewId: string, imageId: string) => {
    if (!user) return;

    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;
    const image = review.images?.find(i => i.id === imageId);
    if (!image) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(["feed", user.id, showGroupActivity], (oldData) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((r) => {
            if (r.id === reviewId) {
                return {
                    ...r,
                    images: r.images?.map(img => {
                        if (img.id === imageId) {
                            return {
                                ...img,
                                is_liked: !img.is_liked,
                                likes_count: img.is_liked ? img.likes_count - 1 : img.likes_count + 1
                            };
                        }
                        return img;
                    })
                };
            }
            return r;
          })
        ),
      };
    });

    try {
        if (image.is_liked) {
            await supabase.from('image_likes').delete().eq('user_id', user.id).eq('image_id', imageId);
        } else {
            await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
        }
    } catch (error) {
        // Revert
        queryClient.setQueryData<InfiniteData<FeedReview[]>>(["feed", user.id, showGroupActivity], (oldData) => {
            if (!oldData) return undefined;
            return {
                ...oldData,
                pages: oldData.pages.map((page) =>
                page.map((r) => {
                    if (r.id === reviewId) {
                        return {
                            ...r,
                            images: r.images?.map(img => {
                                if (img.id === imageId) {
                                    return {
                                        ...img,
                                        is_liked: image.is_liked,
                                        likes_count: image.likes_count
                                    };
                                }
                                return img;
                            })
                        };
                    }
                    return r;
                })
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
                    onImageLike={handleImageLike}
                    imagePosition="right"
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
                    <PeopleYouMayKnow />
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
