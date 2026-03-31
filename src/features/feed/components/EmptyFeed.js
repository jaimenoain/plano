import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh] w-full", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-secondary" }) }));
    }
    if (posts.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center text-center py-16 px-8 gap-4", children: [_jsx(MapPin, { className: "h-12 w-12 text-text-disabled" }), _jsx("h2", { className: "text-lg font-semibold text-text-primary", children: "Welcome to Plano" }), _jsx("p", { className: "text-sm text-text-secondary max-w-sm", children: "Your feed is empty. Follow others to see their building logs and visits." }), _jsx(Button, { asChild: true, variant: "default", children: _jsx(Link, { to: "/search?tab=users", children: "Find People" }) }), _jsx("div", { children: _jsx(Button, { variant: "ghost", asChild: true, children: _jsx(Link, { to: "/search", className: "text-text-secondary hover:text-text-primary", children: "Log a building visit" }) }) })] }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-6 max-w-2xl mx-auto pb-10", children: [_jsxs("div", { className: "text-center py-8 space-y-2", children: [_jsx("h2", { className: "text-2xl font-bold", children: "Welcome to Plano!" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Here is some inspiration from our community to get you started." })] }), _jsx("div", { className: "flex flex-col gap-6", children: posts.map((post, index) => (_jsxs(React.Fragment, { children: [_jsx(ReviewCard, { entry: post, onLike: toggleLike, onImageLike: toggleImageLike, showCommunityImages: true }), index === 2 && (_jsx("div", { className: "py-2", children: _jsx(PeopleYouMayKnow, {}) }))] }, post.id))) })] }));
}
