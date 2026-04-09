/**
 * EmptyFeed.tsx
 * Replaces: src/features/feed/components/EmptyFeed.tsx
 *
 * A24 editorial aesthetic applied:
 * - Zero-posts state: no MapPin icon, no Button component — bare text + text link
 * - Posts-with-suggestions state: "Welcome to Plano!" centered heading replaced
 *   with a SectionDivider-style eyebrow label; PeopleYouMayKnow now renders as
 *   the flat list (updated component) inside a contained border-t block
 */
import { Loader2 } from "lucide-react";
import { Link } from "react-router";
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

  // ── Zero posts: bare editorial prompt ──────────────────────────────────────
  if (posts.length === 0) {
    return (
      <div className="py-16 px-2">
        <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-4">
          Get started
        </p>
        <h2 className="text-2xl font-bold text-text-primary leading-tight mb-2">
          Your feed is empty
        </h2>
        <p className="text-sm text-text-secondary mb-6 max-w-sm">
          Follow others to see their building logs, ratings, and visits here.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/search?tab=users"
            className="text-sm font-medium text-text-primary underline underline-offset-4 hover:text-text-secondary transition-colors"
          >
            Find people to follow →
          </Link>
          <Link
            to="/search"
            className="text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary transition-colors"
          >
            Log a building visit →
          </Link>
        </div>
      </div>
    );
  }

  // ── Posts exist: community inspiration + inline suggestions ────────────────
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Eyebrow label — replaces centered "Welcome to Plano!" heading */}
      <div className="border-t border-border-default pt-6">
        <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
          From the community
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
            {/* Inject PeopleYouMayKnow after 3rd post as a contained section */}
            {index === 2 && (
              <div className="border-t border-border-default pt-6">
                <PeopleYouMayKnow />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}