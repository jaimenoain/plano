import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSuggestedFeed } from "@/hooks/useSuggestedFeed";
import { useAuth } from "@/hooks/useAuth";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { PeopleYouMayKnow } from "@/components/feed/PeopleYouMayKnow";
import React from "react";

export function EmptyFeed() {
  const { user } = useAuth();
  const { data, isLoading, toggleLike, toggleImageLike } = useSuggestedFeed();

  const posts = data?.pages.flatMap((page) => page) || [];

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
                        onLike={toggleLike}
                        onImageLike={toggleImageLike}
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
