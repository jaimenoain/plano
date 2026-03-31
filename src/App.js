import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet, ScrollRestoration } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";
import Index from "@/features/feed/pages/Index";
import Auth from "@/features/auth/pages/Auth";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { RouteLoadingFallback } from "@/components/common/RouteLoadingFallback";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";
const UpdatePassword = lazyWithRetry(() => import("@/features/auth/pages/UpdatePassword"));
const Onboarding = lazyWithRetry(() => import("@/features/auth/pages/Onboarding"));
const Explore = lazyWithRetry(() => import("@/features/explore/pages/Explore"));
const Search = lazyWithRetry(() => import("@/features/search/SearchPage"));
const Post = lazyWithRetry(() => import("./pages/Post"));
const Profile = lazyWithRetry(() => import("@/features/profile/pages/Profile"));
const UserPhotoGallery = lazyWithRetry(() => import("@/features/profile/pages/UserPhotoGallery"));
const Settings = lazyWithRetry(() => import("@/features/profile/pages/Settings"));
const BuildingDetails = lazyWithRetry(() => import("@/features/buildings/pages/BuildingDetails"));
const ArchitectDashboard = lazyWithRetry(() => import("@/features/architect/pages/ArchitectDashboard"));
const ArchitectDetails = lazyWithRetry(() => import("@/features/architect/pages/ArchitectDetails"));
const EditArchitect = lazyWithRetry(() => import("@/features/architect/pages/EditArchitect"));
const ReviewDetails = lazyWithRetry(() => import("@/features/buildings/pages/ReviewDetails"));
const Notifications = lazyWithRetry(() => import("@/features/notifications/pages/Notifications"));
const Connect = lazyWithRetry(() => import("@/features/connect/pages/Connect"));
const AddBuilding = lazyWithRetry(() => import("@/features/buildings/pages/AddBuilding"));
const EditBuilding = lazyWithRetry(() => import("@/features/buildings/pages/EditBuilding"));
const WriteReview = lazyWithRetry(() => import("@/features/buildings/pages/WriteReview"));
const CollectionMap = lazyWithRetry(() => import("@/features/collections/components/CollectionMapPage"));
const FolderView = lazyWithRetry(() => import("@/features/profile/pages/FolderView"));
const AdminDashboard = lazyWithRetry(() => import("@/features/admin/pages/Dashboard"));
const Buildings = lazyWithRetry(() => import("@/features/admin/pages/Buildings"));
const MergeBuildings = lazyWithRetry(() => import("@/features/admin/pages/MergeBuildings"));
const MergeComparison = lazyWithRetry(() => import("@/features/admin/pages/MergeComparison"));
const Users = lazyWithRetry(() => import("@/features/admin/pages/Users"));
const Moderation = lazyWithRetry(() => import("@/features/admin/pages/Moderation"));
const ImageWall = lazyWithRetry(() => import("@/features/admin/pages/ImageWall"));
const PhotoAnalytics = lazyWithRetry(() => import("@/features/admin/pages/PhotoAnalytics"));
const BuildingAudit = lazyWithRetry(() => import("@/features/admin/pages/BuildingAudit"));
const StorageJobs = lazyWithRetry(() => import("@/features/admin/pages/StorageJobs"));
const ArchitectClaims = lazyWithRetry(() => import("@/features/admin/pages/ArchitectClaims"));
const Unauthorized = lazyWithRetry(() => import("@/features/admin/pages/Unauthorized"));
import { AdminGuard } from "@/features/admin/components/AdminGuard";
import AdminLayout from "@/features/admin/components/AdminLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import { PwaPrompt } from "@/components/pwa/PwaPrompt";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/common/CookieConsent";
import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";
import { logDiagnosticError } from "@/features/admin/api/diagnostics";
import { setSentryUser } from "@/lib/sentry";
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
            },
        },
    });
}
const RootLayout = () => (_jsxs(_Fragment, { children: [_jsx(ScrollRestoration, {}), _jsx(Outlet, {})] }));
const router = createBrowserRouter(createRoutesFromElements(_jsxs(Route, { element: _jsx(RootLayout, {}), children: [_jsx(Route, { path: "/auth", element: _jsx(Auth, {}) }), _jsx(Route, { path: "/update-password", element: _jsx(UpdatePassword, {}) }), _jsx(Route, { path: "/onboarding", element: _jsx(Onboarding, {}) }), _jsx(Route, { path: "/terms", element: _jsx(Terms, {}) }), _jsx(Route, { path: "/admin/unauthorized", element: _jsx(Unauthorized, {}) }), _jsx(Route, { path: "/admin/merge", element: _jsx(MergeBuildings, {}) }), _jsx(Route, { path: "/admin/merge/:targetId/:sourceId", element: _jsx(MergeComparison, {}) }), _jsxs(Route, { element: _jsx(AdminGuard, { children: _jsx(AdminLayout, {}) }), children: [_jsx(Route, { path: "/admin", element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "/admin/buildings", element: _jsx(Buildings, {}) }), _jsx(Route, { path: "/admin/users", element: _jsx(Users, {}) }), _jsx(Route, { path: "/admin/moderation", element: _jsx(Moderation, {}) }), _jsx(Route, { path: "/admin/images", element: _jsx(ImageWall, {}) }), _jsx(Route, { path: "/admin/photos", element: _jsx(PhotoAnalytics, {}) }), _jsx(Route, { path: "/admin/audit", element: _jsx(BuildingAudit, {}) }), _jsx(Route, { path: "/admin/claims", element: _jsx(ArchitectClaims, {}) }), _jsx(Route, { path: "/admin/storage-jobs", element: _jsx(StorageJobs, {}) }), _jsx(Route, { path: "/admin/system", element: _jsx("div", { children: "System (Coming Soon)" }) })] }), _jsxs(Route, { element: _jsx(MainLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Index, {}) }), _jsx(Route, { path: "/explore", element: _jsx(Explore, {}) }), _jsx(Route, { path: "/search", element: _jsx(Search, {}) }), _jsx(Route, { path: "/post", element: _jsx(Post, {}) }), _jsx(Route, { path: "/notifications", element: _jsx(Notifications, {}) }), _jsx(Route, { path: "/add-building", element: _jsx(AddBuilding, {}) }), _jsx(Route, { path: "/connect", element: _jsx(Connect, {}) }), _jsx(Route, { path: "/groups/*", element: _jsx(NotFound, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, {}) }), _jsx(Route, { path: "/profile/:username", element: _jsx(Profile, {}) }), _jsx(Route, { path: "/profile/photos", element: _jsx(UserPhotoGallery, {}) }), _jsx(Route, { path: "/profile/:username/photos", element: _jsx(UserPhotoGallery, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) }), _jsx(Route, { path: "/:username/map/:slug", element: _jsx(CollectionMap, {}) }), _jsx(Route, { path: "/:username/folders/:slug", element: _jsx(FolderView, {}) }), _jsx(Route, { path: "/building/:id/:slug", element: _jsx(BuildingDetails, {}) }), _jsx(Route, { path: "/building/:id", element: _jsx(BuildingDetails, {}) }), _jsx(Route, { path: "/building/:id/:slug/edit", element: _jsx(EditBuilding, {}) }), _jsx(Route, { path: "/building/:id/edit", element: _jsx(EditBuilding, {}) }), _jsx(Route, { path: "/architect/dashboard", element: _jsx(ArchitectDashboard, {}) }), _jsx(Route, { path: "/architect/:id", element: _jsx(ArchitectDetails, {}) }), _jsx(Route, { path: "/architect/:id/edit", element: _jsx(EditArchitect, {}) }), _jsx(Route, { path: "/building/:id/:slug/review", element: _jsx(WriteReview, {}) }), _jsx(Route, { path: "/building/:id/review", element: _jsx(WriteReview, {}) }), _jsx(Route, { path: "/review/:id", element: _jsx(ReviewDetails, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] })] })));
const AppContent = () => {
    const { user, loading: authLoading } = useAuth();
    useLoginTracker();
    usePresenceTracker();
    useEffect(() => {
        if (authLoading)
            return;
        setSentryUser(user?.id ?? null);
    }, [user, authLoading]);
    useEffect(() => {
        // Global error handler for diagnostic logging
        const handleError = (event) => {
            // Filter out noisy errors if needed, or log everything
            logDiagnosticError('GlobalError', event.message, event.error?.stack);
        };
        const handleUnhandledRejection = (event) => {
            logDiagnosticError('UnhandledRejection', String(event.reason));
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);
    return (_jsx(TooltipProvider, { children: _jsxs(PwaProvider, { children: [_jsx(GoogleAnalytics, {}), _jsx(CookieConsent, {}), _jsx(PwaPrompt, {}), _jsx(Toaster, {}), _jsx(Sonner, {}), _jsx(RouteErrorBoundary, { children: _jsx(Suspense, { fallback: _jsx(RouteLoadingFallback, {}), children: _jsx(RouterProvider, { router: router }) }) })] }) }));
};
const App = () => {
    const [queryClient] = useState(makeQueryClient);
    return (_jsx(AppErrorBoundary, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(HelmetProvider, { children: _jsx(AuthProvider, { children: _jsx(AppContent, {}) }) }) }) }));
};
export default App;
