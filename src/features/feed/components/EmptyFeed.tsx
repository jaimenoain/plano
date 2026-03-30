import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ReviewCard } from "./ReviewCard";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";
import React from "react";

export function EmptyFeed() {
  const { user: _user } = useAuth();
  const { data, isLoading, toggleLike, toggleImageLike } = useSuggestedFeed();

  const posts = data?.pages.flatMap((page) => page) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-4">
        <MapPin className="h-12 w-12 text-text-disabled" />
        <h2 className="text-lg font-semibold text-text-primary">Welcome to Plano</h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Your feed is empty. Follow others to see their building logs and visits.
        </p>
        <Button asChild variant="default">
          <Link to="/search?tab=users">Find People</Link>
        </Button>
        <div>
          <Button variant="ghost" asChild>
            <Link to="/search" className="text-text-secondary hover:text-text-primary">
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
        <p className="text-sm text-text-secondary">
          Here is some inspiration from our community to get you started.
        </p>
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
