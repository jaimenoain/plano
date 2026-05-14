import React, { useEffect, useMemo, useCallback } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ColdStartFeed } from "../components/ColdStartFeed";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingFooter } from "../components/landing/LandingFooter";
import { useSeenItems } from "../hooks/useSeenItems";
import { useExploreShell } from "@/components/layout/ExploreShellContext";
import { FeedRightRail } from "../components/FeedRightRail";
import { getFeedRanked } from "../api/getFeedRanked";
import { getCollectionsFeedAsItems } from "../api/getCollectionsFeedAsItems";
import { getSuggestedPostsAsItems } from "../api/getSuggestedPostsAsItems";
import { getFeedExtended } from "../api/getFeedExtended";
import { getBuildingSpotlights } from "../api/getBuildingSpotlights";
import { getEditorialSlots } from "../api/getEditorialSlots";
import { getFeedClusters } from "../api/getFeedClusters";
import { mergeFeedSources } from "../utils/mergeFeedSources";
import { FeedMosaic } from "../components/FeedMosaic";
import type { FeedItem, FeedItemPost } from "@/types/feedItem";
export type { FeedItem };

const INDEX_TITLE = "Plano — The world's architecture, cataloged.";
const INDEX_DESCRIPTION =
  "Track your architecture visits, rate buildings, and discover what friends are exploring.";
const INDEX_CANONICAL = `${SITE_URL}/`;
const INDEX_OG_IMAGE = `${SITE_URL}/cover.jpg`;

export const meta: MetaFunction = () => [
  { title: INDEX_TITLE },
  { name: "description", content: INDEX_DESCRIPTION },
  { property: "og:title", content: INDEX_TITLE },
  { property: "og:description", content: INDEX_DESCRIPTION },
  { property: "og:image", content: INDEX_OG_IMAGE },
  { property: "og:type", content: "website" },
  { property: "og:url", content: INDEX_CANONICAL },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: INDEX_TITLE },
  { name: "twitter:description", content: INDEX_DESCRIPTION },
  { name: "twitter:image", content: INDEX_OG_IMAGE },
  { tagName: "link", rel: "canonical", href: INDEX_CANONICAL },
  {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "url": SITE_URL,
      "name": "Plano",
      "description": "The world's architecture, cataloged.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  },
];

// --- Landing page (logged-out) ---
function Landing() {
  const { setLandingHideTopChrome } = useExploreShell();
  useEffect(() => {
    setLandingHideTopChrome(true);
    return () => setLandingHideTopChrome(false);
  }, [setLandingHideTopChrome]);

  return (
    <AppLayout showNav={false} showFooter={false}>
      <LandingNav />
      <main className="flex-1 w-full min-w-0 overflow-x-hidden">
        <LandingHero />
        <LandingMarquee />
        <section className="max-w-5xl mx-auto py-24 px-5 md:px-8">
          <div className="mb-16 space-y-3">
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-disabled">
              What we're building
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary max-w-xl">
              A permanent record of the built world.
            </h2>
          </div>
          <LandingFeatureGrid />
        </section>
      </main>
      <LandingFooter />
    </AppLayout>
  );
}

// --- Main Index Component ---
export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && !authLoading) {
      if (!user.user_metadata?.onboarding_completed) {
        navigate("/onboarding");
      }
    }
  }, [user, authLoading, navigate]);

  const { data: followingCount } = useQuery({
    queryKey: ["following-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const seenItems = useSeenItems();

  const v2SocialQuery = useQuery({
    queryKey: ["v2-social-feed", user?.id],
    queryFn: () => getFeedRanked({ limit: 30 }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const v2CollectionsQuery = useQuery({
    queryKey: ["v2-collections-feed", user?.id],
    queryFn: () => getCollectionsFeedAsItems({ limit: 30 }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const v2DiscoveryQuery = useQuery({
    queryKey: ["v2-discovery-feed", user?.id],
    queryFn: () => getSuggestedPostsAsItems({ limit: 30 }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const v2ExtendedQuery = useQuery({
    queryKey: ["v2-extended-feed", user?.id],
    queryFn: () => getFeedExtended({ limit: 30 }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const v2SpotlightsQuery = useQuery({
    queryKey: ["v2-spotlights-feed", user?.id],
    queryFn: () => getBuildingSpotlights({ limit: 20 }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const v2EditorialQuery = useQuery({
    queryKey: ["v2-editorial-feed", user?.id],
    queryFn: () => getEditorialSlots(),
    enabled: !!user,
    staleTime: 15 * 60 * 1000,
  });

  const v2ClustersQuery = useQuery({
    queryKey: ["v2-clusters-feed", user?.id],
    queryFn: () => getFeedClusters({ limit: 20 }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const v2Items = useMemo(() => {
    const social = v2SocialQuery.data ?? [];
    const collections = v2CollectionsQuery.data ?? [];
    const discovery = v2DiscoveryQuery.data ?? [];
    const extended = v2ExtendedQuery.data ?? [];
    const spotlights = v2SpotlightsQuery.data ?? [];
    const editorial = v2EditorialQuery.data ?? [];
    const clusters = v2ClustersQuery.data ?? [];
    return mergeFeedSources(social, collections, discovery, extended, spotlights, seenItems.hasSeen, editorial, clusters);
  }, [v2SocialQuery.data, v2CollectionsQuery.data, v2DiscoveryQuery.data, v2ExtendedQuery.data, v2SpotlightsQuery.data, v2EditorialQuery.data, v2ClustersQuery.data, seenItems.hasSeen]);

  const handleV2Like = useCallback(async (reviewId: string) => {
    if (!user) return;

    const queries = [
      { key: ["v2-social-feed", user.id], query: v2SocialQuery },
      { key: ["v2-discovery-feed", user.id], query: v2DiscoveryQuery },
      { key: ["v2-collections-feed", user.id], query: v2CollectionsQuery },
      { key: ["v2-extended-feed", user.id], query: v2ExtendedQuery },
    ];

    for (const { key } of queries) {
      const currentData = queryClient.getQueryData<FeedItem[]>(key);
      if (!currentData) continue;

      queryClient.setQueryData<FeedItem[]>(key, (old) => {
        if (!old) return [];
        return old.map((item) => {
          if (item.kind === "post" && item.payload.id === reviewId) {
            const isLiked = !item.payload.is_liked;
            return {
              ...item,
              payload: {
                ...item.payload,
                is_liked: isLiked,
                likes_count: isLiked ? item.payload.likes_count + 1 : item.payload.likes_count - 1,
              },
            };
          }
          return item;
        });
      });
    }

    try {
      const isLiked = v2SocialQuery.data?.find(i => i.id === reviewId && i.kind === "post")?.payload.is_liked ?? false;
      if (isLiked) {
        await supabase.from("likes").delete().eq("interaction_id", reviewId).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ interaction_id: reviewId, user_id: user.id });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      queries.forEach(({ key }) => queryClient.invalidateQueries({ queryKey: key }));
    }
  }, [user, queryClient, v2SocialQuery.data, v2DiscoveryQuery, v2CollectionsQuery, v2ExtendedQuery]);

  const handleV2ImageLike = useCallback(async (reviewId: string, imageId: string) => {
    if (!user) return;

    const queries = [
      { key: ["v2-social-feed", user.id] },
      { key: ["v2-discovery-feed", user.id] },
      { key: ["v2-collections-feed", user.id] },
      { key: ["v2-extended-feed", user.id] },
    ];

    for (const { key } of queries) {
      queryClient.setQueryData<FeedItem[]>(key, (old) => {
        if (!old) return old;
        return old.map((item) => {
          if (item.kind === "post" && item.payload.id === reviewId) {
            return {
              ...item,
              payload: {
                ...item.payload,
                images: item.payload.images?.map((img) => {
                  if (img.id === imageId) {
                    const isLiked = !img.is_liked;
                    return {
                      ...img,
                      is_liked: isLiked,
                      likes_count: isLiked ? img.likes_count + 1 : img.likes_count - 1,
                    };
                  }
                  return img;
                }),
              },
            };
          }
          return item;
        });
      });
    }

    try {
      const img = v2SocialQuery.data?.find(i => i.id === reviewId && i.kind === "post")?.payload.images?.find(im => im.id === imageId);
      if (img?.is_liked) {
        await supabase.from("image_likes").delete().eq("user_id", user.id).eq("image_id", imageId);
      } else {
        await supabase.from("image_likes").insert({ user_id: user.id, image_id: imageId });
      }
    } catch (err) {
      console.error("Failed to toggle image like:", err);
      queries.forEach(({ key }) => queryClient.invalidateQueries({ queryKey: key }));
    }
  }, [user, queryClient, v2SocialQuery.data]);

  const v2DiscoveryReviews = useMemo(
    () => (v2DiscoveryQuery.data ?? [])
      .filter((i): i is FeedItemPost => i.kind === "post")
      .map(i => i.payload),
    [v2DiscoveryQuery.data]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  const v2SecondaryLoading =
    v2CollectionsQuery.isLoading ||
    v2DiscoveryQuery.isLoading ||
    v2ExtendedQuery.isLoading ||
    v2SpotlightsQuery.isLoading ||
    v2EditorialQuery.isLoading ||
    v2ClustersQuery.isLoading;

  const v2AnyLoading = v2SocialQuery.isLoading || (v2Items.length === 0 && v2SecondaryLoading);

  return (
    <AppLayout>
      {v2AnyLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto bg-surface-default md:border-l md:border-r border-border-default min-h-screen">
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0 md:border-r md:border-border-default">
              <div className="pt-10 pb-32">
                {v2Items.length === 0 ? (
                  <div className="px-4 md:px-6 lg:px-16">
                    <ColdStartFeed
                      discoveryReviews={v2DiscoveryReviews}
                      onLike={handleV2Like}
                      onImageLike={handleV2ImageLike}
                      isDiscoveryLoading={v2DiscoveryQuery.isLoading}
                      isEmptyFeed={(followingCount ?? 0) > 0}
                      hideSuggestions={(followingCount ?? 0) === 0}
                    />
                  </div>
                ) : (
                  <>
                    <FeedMosaic
                      items={v2Items}
                      followingCount={followingCount ?? 0}
                      onLike={handleV2Like}
                      onImageLike={handleV2ImageLike}
                    />
                    {v2SecondaryLoading && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </main>
            <FeedRightRail activities={[]} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
