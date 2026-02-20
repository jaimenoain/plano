import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSuggestedFeed } from "@/hooks/useSuggestedFeed";
import { useAuth } from "@/hooks/useAuth";
import { FeedReview } from "@/types/feed";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { PeopleYouMayKnow } from "@/components/feed/PeopleYouMayKnow";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import React from "react";

export function EmptyFeed() {
  const { user } = useAuth();
  const { data, isLoading } = useSuggestedFeed();
  const queryClient = useQueryClient();

  const posts = data?.pages.flatMap((page) => page) || [];

  const handleLike = async (reviewId: string) => {
    if (!user) return;

    const review = posts.find((r) => r.id === reviewId);
    if (!review) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(["suggested_feed", user.id], (oldData) => {
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
      console.error("Error toggling like:", error);
      // Revert
      queryClient.setQueryData<InfiniteData<FeedReview[]>>(["suggested_feed", user.id], (oldData) => {
        if (!oldData) return undefined;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    is_liked: review.is_liked,
                    likes_count: review.likes_count,
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

    const review = posts.find(r => r.id === reviewId);
    if (!review) return;
    const image = review.images?.find(i => i.id === imageId);
    if (!image) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(["suggested_feed", user.id], (oldData) => {
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
        console.error("Error toggling image like:", error);
        // Revert
        queryClient.setQueryData<InfiniteData<FeedReview[]>>(["suggested_feed", user.id], (oldData) => {
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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
            <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
            Welcome to Plano
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xs">
            Your feed is empty. Follow others to see their building logs and visits.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/search?tab=users">
            Find People
            </Link>
        </Button>
        <div className="mt-4">
            <Button variant="ghost" asChild>
                <Link to="/search" className="text-muted-foreground hover:text-foreground">
                    Log a building visit
                </Link>
            </Button>
        </div>
        </div>
    );
  }

  return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-10">
          <div className="text-center py-8 space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Plano!</h2>
              <p className="text-muted-foreground">Here is some inspiration from our community to get you started.</p>
          </div>

          <div className="flex flex-col gap-6">
            {posts.map((post, index) => (
                <React.Fragment key={post.id}>
                    <ReviewCard
                        entry={post}
                        onLike={handleLike}
                        onImageLike={handleImageLike}
                        showCommunityImages={true}
                    />
                    {/* Insert PeopleYouMayKnow after the 3rd post (index 2) */}
                    {index === 2 && (
                        <div className="py-2">
                            <PeopleYouMayKnow />
                        </div>
                    )}
                </React.Fragment>
            ))}
          </div>
      </div>
  );
}
