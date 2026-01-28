import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyFeed } from "@/components/feed/EmptyFeed";
import { PeopleYouMayKnow } from "@/components/feed/PeopleYouMayKnow";
import { useAuth } from "@/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useInfiniteQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetaHead } from "@/components/common/MetaHead";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { FeedReview } from "@/types/feed";
import { aggregateFeed } from "@/lib/feed-aggregation";
import { FeedHeroCard } from "@/components/feed/FeedHeroCard";
import { FeedClusterCard } from "@/components/feed/FeedClusterCard";
import { FeedCompactCard } from "@/components/feed/FeedCompactCard";
import { getBuildingImageUrl } from "@/utils/image";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingMarquee } from "@/components/landing/LandingMarquee";
import { LandingFeatureGrid } from "@/components/landing/LandingFeatureGrid";
import { Header } from "@/components/layout/Header";

// --- New Landing Page Component ---
function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header
        className={isScrolled ? undefined : "bg-transparent border-none shadow-none backdrop-blur-none"}
        showLogo={true}
      />

      <LandingHero />
      <LandingMarquee />

      <div className="container mx-auto px-4 py-16 space-y-16">
        <LandingFeatureGrid />
      </div>

      {/* Simple Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Plano. All rights reserved.</p>
      </footer>
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
          short_id: review.building_data?.short_id,
          slug: review.building_data?.slug,
          name: review.building_data?.name || "Unknown Building",
          address: review.building_data?.address || null,
          city: review.building_data?.city || null,
          country: review.building_data?.country || null,
          main_image_url: review.building_data?.main_image_url || null,
          architects: review.building_data?.architects || null,
          year_completed: review.building_data?.year_completed || null,
        },
        likes_count: review.likes_count || 0,
        comments_count: review.comments_count || 0,
        is_liked: review.is_liked,
        images: (review.review_images || []).map((img: any) => {
            return {
                id: img.id,
                url: getBuildingImageUrl(img.storage_path),
                likes_count: img.likes_count || 0,
                is_liked: img.is_liked
            };
        }),
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

  const reviews = useMemo(() => data?.pages.flatMap((page) => page) || [], [data]);
  const aggregatedReviews = useMemo(() => aggregateFeed(reviews), [reviews]);

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
              <div className="w-full lg:w-2/3 flex flex-col gap-3">
                {aggregatedReviews.map((item) => {
                  const key = item.type === 'cluster' ? `cluster-${item.entries[0].id}` : item.entry.id;

                  if (item.type === 'hero') {
                      return <FeedHeroCard key={key} entry={item.entry} onLike={handleLike} onImageLike={handleImageLike} />;
                  }
                  if (item.type === 'compact') {
                      return <FeedCompactCard key={key} entry={item.entry} onLike={handleLike} />;
                  }
                  if (item.type === 'cluster') {
                      return <FeedClusterCard key={key} entries={item.entries} user={item.user} location={item.location} timestamp={item.timestamp} />;
                  }
                  return null;
                })}

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
