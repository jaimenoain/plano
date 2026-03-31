import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyFeed } from "../components/EmptyFeed";
import { PeopleYouMayKnow } from "../components/PeopleYouMayKnow";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { MetaHead } from "@/components/common/MetaHead";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { aggregateFeed } from "@/lib/feed-aggregation";
import { FeedHeroCard } from "../components/FeedHeroCard";
import { FeedClusterCard } from "../components/FeedClusterCard";
import { FeedCompactCard } from "../components/FeedCompactCard";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { useFeed } from "../hooks/useFeed";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { AllCaughtUpDivider } from "../components/AllCaughtUpDivider";
import { ExploreTeaserBlock } from "../components/ExploreTeaserBlock";
import { ReviewCard } from "../components/ReviewCard";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
// --- New Landing Page Component ---
function Landing() {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "min-h-screen bg-surface-default flex flex-col w-full overflow-x-hidden", children: [_jsx("header", { className: "fixed top-0 left-0 right-0 z-50 bg-surface-card/90 backdrop-blur-md border-b border-border-default h-16", children: _jsxs("div", { className: "container h-full mx-auto px-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx(SidebarTrigger, { className: "shrink-0 border border-border-default bg-surface-card/90 shadow-sm", "aria-label": "Open menu" }), _jsx(PlanoLogo, { className: "h-8 w-auto text-text-primary [&_path]:fill-current" })] }), _jsx(Button, { variant: "ghost", onClick: () => navigate("/auth"), className: "h-10 px-4 font-medium bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-sm", children: "Log in" })] }) }), _jsxs("main", { className: "flex-1 w-full min-w-0 overflow-x-hidden pt-16 md:pt-20", children: [_jsx(LandingHero, {}), _jsx(LandingMarquee, {}), _jsxs("div", { className: "container mx-auto py-24 px-4", children: [_jsxs("div", { className: "text-center mb-16 space-y-4", children: [_jsx("h2", { className: "text-4xl font-bold tracking-tight text-text-primary", children: "Everything you need" }), _jsx("p", { className: "text-text-secondary text-lg max-w-2xl mx-auto", children: "Built for architecture enthusiasts, by architecture enthusiasts." })] }), _jsx(LandingFeatureGrid, {})] })] })] }));
}
// --- Main Index Component ---
export default function Index() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile: _isMobile } = useSidebar();
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
    // Social Feed
    const socialFeed = useFeed({ showGroupActivity });
    // Discovery Feed (Suggested)
    // Enable fetching only when social feed is exhausted or empty (though EmptyFeed handles empty case)
    // We want to append discovery content after social content.
    const shouldFetchDiscovery = !!user && (!socialFeed.hasNextPage && !socialFeed.isLoading);
    const discoveryFeed = useSuggestedFeed({ enabled: shouldFetchDiscovery });
    // Load More Logic
    useEffect(() => {
        if (isLoadMoreVisible) {
            if (socialFeed.hasNextPage && !socialFeed.isFetchingNextPage && !socialFeed.isError) {
                socialFeed.fetchNextPage();
            }
            else if (!socialFeed.hasNextPage && discoveryFeed.hasNextPage && !discoveryFeed.isFetchingNextPage && !discoveryFeed.isError) {
                discoveryFeed.fetchNextPage();
            }
        }
    }, [
        isLoadMoreVisible,
        socialFeed.hasNextPage, socialFeed.isFetchingNextPage, socialFeed.isError, socialFeed.fetchNextPage,
        discoveryFeed.hasNextPage, discoveryFeed.isFetchingNextPage, discoveryFeed.isError, discoveryFeed.fetchNextPage
    ]);
    const socialReviews = useMemo(() => socialFeed.data?.pages.flatMap((page) => page) || [], [socialFeed.data]);
    const aggregatedReviews = useMemo(() => aggregateFeed(socialReviews), [socialReviews]);
    const discoveryReviews = useMemo(() => discoveryFeed.data?.pages.flatMap((page) => page) || [], [discoveryFeed.data]);
    if (authLoading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-default flex flex-col items-center justify-center", children: _jsx(Loader2, { className: "h-10 w-10 animate-spin text-text-secondary" }) }));
    }
    if (!user) {
        return _jsx(Landing, {});
    }
    return (_jsxs(AppLayout, { variant: "home", children: [_jsx(MetaHead, { title: "Home" }), socialFeed.isLoading ? (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(Loader2, { className: "h-10 w-10 animate-spin text-text-secondary" }) })) : (_jsx("div", { className: "p-4 sm:p-6 lg:p-8 pb-24 mx-auto w-full", children: socialReviews.length === 0 ? (_jsx(EmptyFeed, {})) : (_jsxs("div", { className: "flex gap-8 items-start max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex-1 max-w-2xl min-w-0 flex flex-col gap-3", children: [aggregatedReviews.map((item, index) => {
                                    const key = item.type === 'cluster' ? `cluster-${item.entries[0].id}` : item.entry.id;
                                    let card = null;
                                    if (item.type === 'hero') {
                                        card = _jsx(FeedHeroCard, { entry: item.entry, onLike: socialFeed.toggleLike, onImageLike: socialFeed.toggleImageLike }, key);
                                    }
                                    else if (item.type === 'compact') {
                                        card = _jsx(FeedCompactCard, { entry: item.entry, onLike: socialFeed.toggleLike }, key);
                                    }
                                    else if (item.type === 'cluster') {
                                        card = _jsx(FeedClusterCard, { entries: item.entries, user: item.user, location: item.location, timestamp: item.timestamp }, key);
                                    }
                                    return (_jsxs(React.Fragment, { children: [card, (index + 1) % 10 === 0 && (_jsx("div", { className: "py-2", children: _jsx(WidgetErrorBoundary, { children: _jsx(ExploreTeaserBlock, {}) }) }, `explore-teaser-${key}-${index}`))] }, key));
                                }), !socialFeed.hasNextPage && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-12 border-t border-border-default pt-8", children: _jsx(AllCaughtUpDivider, {}) }), _jsx("div", { className: "py-2", children: _jsx(WidgetErrorBoundary, { children: _jsx(ExploreTeaserBlock, {}) }) }), _jsx(WidgetErrorBoundary, { children: _jsxs("div", { className: "flex flex-col gap-6 mt-6", children: [discoveryReviews.map((post) => (_jsx(ReviewCard, { entry: post, onLike: discoveryFeed.toggleLike, onImageLike: discoveryFeed.toggleImageLike, showCommunityImages: true }, `discovery-${post.id}`))), discoveryFeed.isLoading && (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) }))] }) })] })), (socialFeed.hasNextPage || discoveryFeed.hasNextPage) && (_jsx("div", { ref: loadMoreRef, className: "flex justify-center mt-4 py-8", children: (socialFeed.isFetchingNextPage || discoveryFeed.isFetchingNextPage) ? (_jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" })) : (socialFeed.isError || discoveryFeed.isError) ? (_jsx(Button, { variant: "ghost", onClick: () => socialFeed.hasNextPage ? socialFeed.fetchNextPage() : discoveryFeed.fetchNextPage(), className: "text-text-secondary hover:text-text-primary", children: "Error loading more. Click to retry." })) : (_jsx(Button, { variant: "ghost", className: "text-text-secondary hover:text-text-primary opacity-0", children: "Load More" })) }))] }), _jsx("div", { className: "w-72 flex-shrink-0 hidden lg:block sticky top-20", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "p-6 border border-border-default rounded-sm bg-surface-card shadow-none", children: [_jsx("h3", { className: "font-semibold mb-2 text-text-primary", children: "Trending" }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["Discover popular buildings and active discussions in the community.", _jsx("br", {}), _jsx("br", {}), "(Coming soon)"] })] }), _jsx(WidgetErrorBoundary, { children: _jsx(PeopleYouMayKnow, {}) })] }) })] })) }))] }));
}
